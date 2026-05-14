import DriverMapPanel from "../components/DriverMapPanel";
import { buildStudentRoute } from "../utils";

function MapView({ t, tripStarted, statusText, currentStudent, routeStudents, busLive }) {
  const selectedStudent = currentStudent || routeStudents[0] || null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <DriverMapPanel
        busLocation={busLive?.location}
        pickupLocation={selectedStudent?.homeLocation || null}
        routeLine={selectedStudent ? buildStudentRoute(busLive?.location, selectedStudent.homeLocation) : []}
      />
      <div className="rounded-[16px] bg-accent px-4 py-3 text-center text-sm font-extrabold text-slate-900 shadow-[var(--shadow-soft)]">
        {tripStarted ? statusText : t("notStarted")}
      </div>
    </div>
  );
}

export default MapView;
