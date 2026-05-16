function formatDateLabel(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function buildBusPool(buses = []) {
  const fallback = [
    { id: "B-01", name: "Bus Atlas", routeName: "Centre Ville", plateNumber: "20754-A-6", driverId: "D-01", driverName: "Yassine El Idrissi" },
    { id: "B-02", name: "Bus Cèdre", routeName: "Anfa / Maarif", plateNumber: "19862-B-6", driverId: "D-02", driverName: "Samir Lahlou" },
    { id: "B-03", name: "Bus Oasis", routeName: "Hay Hassani", plateNumber: "22419-C-6", driverId: "D-03", driverName: "Nadia Bennis" },
  ];

  const normalized = buses.map((bus, index) => ({
    id: bus.id,
    name: bus.name || fallback[index % fallback.length].name,
    routeName: bus.routeName || fallback[index % fallback.length].routeName,
    plateNumber: bus.plateNumber || fallback[index % fallback.length].plateNumber,
    driverId: bus.driverId || fallback[index % fallback.length].driverId,
    driverName: bus.driverName || fallback[index % fallback.length].driverName,
    capacity: bus.capacity || 24,
    location: bus.location || null,
  }));

  return normalized.length >= 3 ? normalized : [...normalized, ...fallback.slice(normalized.length)];
}

function buildStudentPool(students = []) {
  const fallback = Array.from({ length: 12 }, (_, index) => ({
    id: `S-${index + 1}`,
    name: `Élève ${index + 1}`,
    regCode: `MASSAR-${String(index + 1).padStart(5, "0")}`,
    address: `Adresse ${index + 1}`,
    parentName: `Parent ${index + 1}`,
  }));

  const base = (students.length ? students : fallback).slice(0, 12);
  return base.map((student, index) => ({
    id: student.id,
    name: student.name || fallback[index].name,
    regCode: student.regCode || `MASSAR-${String(index + 1).padStart(5, "0")}`,
    address: student.address || fallback[index].address,
    parentName: student.parentName || fallback[index].parentName,
  }));
}

function buildArchiveTrips(students, buses) {
  const studentPool = buildStudentPool(students);
  const busPool = buildBusPool(buses);
  const tripTemplates = [
    { id: "TRJ-240510-A1", type: "aller", dayOffset: 6, busIndex: 0, startHour: 7, duration: 46, boardedIds: [0, 1, 2, 3, 4, 5], absentIds: [6] },
    { id: "TRJ-240510-R1", type: "retour", dayOffset: 6, busIndex: 0, startHour: 16, duration: 42, boardedIds: [0, 1, 2, 3, 4], absentIds: [5] },
    { id: "TRJ-240511-A2", type: "aller", dayOffset: 5, busIndex: 1, startHour: 7, duration: 51, boardedIds: [1, 2, 4, 5, 6], absentIds: [0, 3] },
    { id: "TRJ-240511-R2", type: "retour", dayOffset: 5, busIndex: 1, startHour: 16, duration: 45, boardedIds: [1, 2, 4, 5], absentIds: [6] },
    { id: "TRJ-240512-A3", type: "aller", dayOffset: 4, busIndex: 2, startHour: 7, duration: 54, boardedIds: [0, 2, 3, 4, 6, 7], absentIds: [1] },
    { id: "TRJ-240512-R3", type: "retour", dayOffset: 4, busIndex: 2, startHour: 16, duration: 39, boardedIds: [0, 2, 3, 4, 6], absentIds: [7] },
    { id: "TRJ-240513-A4", type: "aller", dayOffset: 3, busIndex: 0, startHour: 7, duration: 49, boardedIds: [0, 3, 5, 6, 8], absentIds: [2] },
    { id: "TRJ-240513-R4", type: "retour", dayOffset: 3, busIndex: 1, startHour: 16, duration: 44, boardedIds: [0, 3, 5, 6], absentIds: [8] },
    { id: "TRJ-240514-A5", type: "aller", dayOffset: 2, busIndex: 2, startHour: 7, duration: 53, boardedIds: [1, 4, 5, 7, 8, 9], absentIds: [0] },
    { id: "TRJ-240514-R5", type: "retour", dayOffset: 2, busIndex: 0, startHour: 16, duration: 40, boardedIds: [1, 4, 5, 7, 8], absentIds: [9] },
    { id: "TRJ-240515-A6", type: "aller", dayOffset: 1, busIndex: 1, startHour: 7, duration: 47, boardedIds: [2, 3, 6, 8, 9, 10], absentIds: [1] },
    { id: "TRJ-240515-R6", type: "retour", dayOffset: 1, busIndex: 2, startHour: 16, duration: 43, boardedIds: [2, 3, 6, 8, 9], absentIds: [10] },
    { id: "TRJ-240516-A7", type: "aller", dayOffset: 0, busIndex: 0, startHour: 7, duration: 48, boardedIds: [0, 1, 2, 3, 4, 10, 11], absentIds: [5] },
    { id: "TRJ-240516-R7", type: "retour", dayOffset: 0, busIndex: 1, startHour: 16, duration: 41, boardedIds: [0, 1, 2, 3, 4, 10], absentIds: [11] },
  ];

  return tripTemplates.map((template, index) => {
    const tripDate = new Date();
    tripDate.setHours(0, 0, 0, 0);
    tripDate.setDate(tripDate.getDate() - template.dayOffset);

    const startedAt = new Date(tripDate);
    startedAt.setHours(template.startHour, 8 + (index % 4) * 6, 0, 0);
    const completedAt = new Date(startedAt.getTime() + template.duration * 60000);
    const bus = busPool[template.busIndex % busPool.length];

    const attendance = studentPool.map((student, studentIndex) => {
      const status = template.absentIds.includes(studentIndex)
        ? "absent"
        : template.boardedIds.includes(studentIndex)
          ? "in_bus"
          : "waiting";

      return {
        studentId: student.id,
        fullName: student.name,
        massarCode: student.regCode,
        status,
        pickupAddress: student.address,
        parentName: student.parentName,
      };
    });

    const boardedCount = attendance.filter((entry) => entry.status === "in_bus").length;
    const absentCount = attendance.filter((entry) => entry.status === "absent").length;

    return {
      id: template.id,
      busId: bus.id,
      busName: bus.name,
      plateNumber: bus.plateNumber,
      routeName: bus.routeName,
      driverId: bus.driverId,
      driverName: bus.driverName,
      type: template.type,
      status: "completed",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMinutes: minutesBetween(startedAt, completedAt),
      boardedCount,
      absentCount,
      attendance,
    };
  });
}

function buildDurationSeries(archiveTrips) {
  const grouped = archiveTrips.reduce((accumulator, trip) => {
    const key = formatDateLabel(new Date(trip.startedAt));
    if (!accumulator[key]) {
      accumulator[key] = { day: key, allerTotal: 0, allerCount: 0, retourTotal: 0, retourCount: 0 };
    }

    if (trip.type === "aller") {
      accumulator[key].allerTotal += trip.durationMinutes;
      accumulator[key].allerCount += 1;
    } else {
      accumulator[key].retourTotal += trip.durationMinutes;
      accumulator[key].retourCount += 1;
    }

    return accumulator;
  }, {});

  return Object.values(grouped).reverse().map((entry) => ({
    day: entry.day,
    aller: entry.allerCount ? Math.round(entry.allerTotal / entry.allerCount) : 0,
    retour: entry.retourCount ? Math.round(entry.retourTotal / entry.retourCount) : 0,
  }));
}

function buildAttendanceSplit(archiveTrips) {
  const totals = archiveTrips.reduce((accumulator, trip) => {
    trip.attendance.forEach((entry) => {
      if (entry.status === "absent") accumulator.absent += 1;
      if (entry.status === "in_bus") accumulator.inBus += 1;
    });
    return accumulator;
  }, { inBus: 0, absent: 0 });

  return [
    { name: "Présents", value: totals.inBus, color: "#0f9d58" },
    { name: "Absents", value: totals.absent, color: "#e85d75" },
  ];
}

function buildMockNudges(archiveTrips) {
  const targets = archiveTrips.flatMap((trip) => trip.attendance.filter((entry) => entry.status === "in_bus").slice(0, 2).map((entry, entryIndex) => ({
    id: `notif-${trip.id}-${entry.studentId}-${entryIndex + 1}`,
    title: "Nudge / المرجو الإسراع",
    message: `Nudge envoyé au parent de ${entry.fullName}.`,
    studentName: entry.fullName,
    parentName: entry.parentName,
    createdAt: new Date(new Date(trip.startedAt).getTime() - (entryIndex + 1) * 180000).toISOString(),
  })));

  return targets.slice(0, 12);
}

function buildAlertsLog(parents, notifications, archiveTrips) {
  const notificationPool = notifications.length ? notifications : buildMockNudges(archiveTrips);
  const nudgeNotifications = notificationPool.filter((notification) => {
    const message = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
    return message.includes("nudge") || message.includes("hurry") || message.includes("المرجو الإسراع");
  });

  if (nudgeNotifications.length > 0) {
    const grouped = nudgeNotifications.reduce((accumulator, notification) => {
      const key = `${notification.parentName || "Parent"}-${notification.studentName || "Élève"}`;
      if (!accumulator[key]) {
        accumulator[key] = {
          id: notification.id || key,
          parentName: notification.parentName || "Parent",
          childName: notification.studentName || "Élève",
          totalNudges: 0,
          latestAt: notification.createdAt || new Date().toISOString(),
          channel: notification.title || "Nudge",
        };
      }
      accumulator[key].totalNudges += 1;
      if ((notification.createdAt || "") > accumulator[key].latestAt) {
        accumulator[key].latestAt = notification.createdAt;
      }
      return accumulator;
    }, {});

    return Object.values(grouped).sort((a, b) => b.totalNudges - a.totalNudges).slice(0, 8);
  }

  return parents.slice(0, 5).map((parent, index) => ({
    id: parent.id || `mock-parent-${index + 1}`,
    parentName: parent.name || `Parent ${index + 1}`,
    childName: parent.studentName || `Élève ${index + 1}`,
    totalNudges: 2 + (index % 3),
    latestAt: new Date(Date.now() - index * 86400000).toISOString(),
    channel: "Mock notifications table signal",
  }));
}

export function buildAdminDashboardMockData({ students, buses, parents, notifications, activeTrips }) {
  const archiveTrips = buildArchiveTrips(students, buses);
  const analyticsDurations = buildDurationSeries(archiveTrips);
  const attendanceRate = buildAttendanceSplit(archiveTrips);
  const alertsLog = buildAlertsLog(parents, notifications, archiveTrips);
  const activeTripEntries = Object.entries(activeTrips || {}).filter(([, trip]) => ["active", "in_progress"].includes(trip?.status));
  const totalAbsencesToday = archiveTrips
    .filter((trip) => new Date(trip.startedAt).toDateString() === new Date().toDateString())
    .reduce((sum, trip) => sum + trip.absentCount, 0);

  return {
    archiveTrips,
    analyticsDurations,
    attendanceRate,
    alertsLog,
    nudgeNotifications: notifications.length ? notifications : buildMockNudges(archiveTrips),
    summaryCards: {
      activeTripsToday: activeTripEntries.length,
      totalAbsencesToday,
      completedTrips: archiveTrips.length,
      nudgeSignals: alertsLog.reduce((sum, item) => sum + item.totalNudges, 0),
    },
  };
}
