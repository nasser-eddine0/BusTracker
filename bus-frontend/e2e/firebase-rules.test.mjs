import fs from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";

const testEnv = await initializeTestEnvironment({
  projectId: "demo-bustracker",
  database: {
    host: "127.0.0.1",
    port: 9000,
    rules: fs.readFileSync("../database.rules.json", "utf8"),
  },
});

const schoolA = {
  adminA: { active: true, role: "admin" },
  driverA: { active: true, role: "driver", allowedBusIds: { busA: true } },
  parentA: { active: true, role: "parent", allowedBusIds: { busA: true } },
};

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "school_users/schoolA"), schoolA);
    await set(ref(context.database(), "school_users/schoolB/adminB"), { active: true, role: "admin" });
    await set(ref(context.database(), "active_buses/schoolA/busA"), { trip_id: "tripA" });
    await set(ref(context.database(), "active_buses/schoolA/busB"), { trip_id: "tripB" });
    await set(ref(context.database(), "active_trips/schoolA/tripA"), { trip_id: "tripA", bus_id: "busA", status: "in_progress" });
    await set(ref(context.database(), "active_trips/schoolA/tripB"), { trip_id: "tripB", bus_id: "busB", status: "in_progress" });
  });

  const adminA = testEnv.authenticatedContext("adminA").database();
  const driverA = testEnv.authenticatedContext("driverA").database();
  const parentA = testEnv.authenticatedContext("parentA").database();

  await assertSucceeds(get(ref(adminA, "active_trips/schoolA/tripA")));
  await assertFails(get(ref(adminA, "active_trips/schoolB/tripA")));
  await assertSucceeds(get(ref(driverA, "active_trips/schoolA/tripA")));
  await assertFails(get(ref(driverA, "active_trips/schoolA/tripB")));
  await assertSucceeds(get(ref(parentA, "active_trips/schoolA/tripA")));
  await assertFails(get(ref(parentA, "active_trips/schoolA/tripB")));
  await assertFails(get(ref(driverA, "active_trips/schoolA")));
  await assertFails(get(ref(parentA, "active_trips/schoolA")));
  await assertSucceeds(get(ref(driverA, "active_buses/schoolA/busA")));
  await assertFails(get(ref(driverA, "active_buses/schoolA/busB")));
  await assertFails(get(ref(driverA, "active_trips/schoolB/tripA")));
  await assertFails(get(ref(parentA, "active_buses/schoolB/busA")));
  await assertSucceeds(get(ref(parentA, "active_buses/schoolA/busA")));
  await assertFails(get(ref(parentA, "active_buses/schoolA/busB")));
  await assertFails(set(ref(driverA, "active_trips/schoolA/tripA/status"), "completed"));
  await assertFails(set(ref(adminA, "active_buses/schoolA/busA"), { trip_id: "tripA" }));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "school_users/schoolA/driverA/active"), false);
    await set(ref(context.database(), "school_users/schoolA/parentA/active"), false);
    await set(ref(context.database(), "school_users/schoolA/adminA/active"), false);
  });
  await assertFails(get(ref(adminA, "active_trips/schoolA/tripA")));
  await assertFails(get(ref(driverA, "active_trips/schoolA/tripA")));
  await assertFails(get(ref(parentA, "active_buses/schoolA/busA")));
} finally {
  await testEnv.cleanup();
}

console.log("Firebase rules tests passed: 20 assertions");
