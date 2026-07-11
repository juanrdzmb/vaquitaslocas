import type { ItineraryDay, Trip } from "@/lib/schema";

type Moment = {
  title: string;
  detail: string;
};

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function dayDistance(from: string, to: string): number {
  const start = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

function dayLabel(day: ItineraryDay | undefined): string {
  const key = dateKey(day?.date);
  if (!key) return "Fecha por confirmar";
  const date = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function stopDetail(day: ItineraryDay | undefined): Moment {
  const stop = day?.stops[0];
  if (!stop) {
    return {
      title: day?.title || "La ruta empieza aquí",
      detail: day ? dayLabel(day) : "Abre el itinerario cuando quieras.",
    };
  }
  const meta = [stop.time, stop.location].filter(Boolean).join(" · ");
  return {
    title: stop.title,
    detail: meta || stop.description || "Primera parada del día.",
  };
}

export default function TripNowCard({ trip, now }: { trip: Trip; now: number }) {
  const today = new Date(now).toISOString().slice(0, 10);
  const datedDays = trip.itinerary.filter((day) => dateKey(day.date));
  const firstDay = trip.itinerary[0];
  const lastDay = trip.itinerary[trip.itinerary.length - 1];
  const start = dateKey(trip.startDate) ?? dateKey(datedDays[0]?.date);
  const end =
    dateKey(trip.endDate) ?? dateKey(datedDays[datedDays.length - 1]?.date);
  const todayIndex = trip.itinerary.findIndex(
    (day) => dateKey(day.date) === today
  );

  let eyebrow = "Tu viaje, a mano";
  let heading = "Todo listo para salir a descubrir";
  let summary = trip.itinerary.length
    ? `${trip.itinerary.length} días ordenados para que tú solo tengas que disfrutarlos.`
    : "Tu viaje está reunido aquí para que no tengas que volver a perseguir datos por el Excel.";
  let current: Moment = {
    title: firstDay?.title || trip.destination,
    detail: firstDay?.summary || "El plan completo está a un toque.",
  };
  let next = stopDetail(firstDay);
  let progress = 0;
  let target = firstDay ? `#dia-${firstDay.dayNumber}` : "#trip-top";
  let action = firstDay ? "Abrir el primer día" : "Volver a la portada";

  if (start && today < start) {
    const remaining = dayDistance(today, start);
    eyebrow = "Antes de despegar";
    heading =
      remaining === 0
        ? "El viaje empieza hoy"
        : `Faltan ${remaining} ${remaining === 1 ? "día" : "días"}`;
    summary = `Tu edición de ${trip.destination} ya está organizada y lista para llevar.`;
    current = {
      title: "Todo en un solo sitio",
      detail: "Reservas, ruta, presupuesto y recomendaciones sin volver al Excel.",
    };
    next = {
      title: firstDay ? `Día ${firstDay.dayNumber} · ${firstDay.title}` : trip.destination,
      detail: dayLabel(firstDay),
    };
  } else if (end && today > end) {
    eyebrow = "Viaje completado";
    heading = "Una ruta que se queda contigo";
    summary = `Tu bitácora de ${trip.destination} sigue aquí para recordar, compartir o repetir.`;
    current = {
      title: trip.highlights[0] || lastDay?.title || trip.destination,
      detail: "Lo mejor del viaje, guardado en una página que es solo vuestra.",
    };
    next = {
      title: "Volver cuando quieras",
      detail: "Descarga un día, comparte la ruta o empieza una nueva aventura.",
    };
    progress = 100;
    target = lastDay ? `#dia-${lastDay.dayNumber}` : "#itinerario";
    action = "Revivir el itinerario";
  } else if ((start && end) || todayIndex >= 0) {
    const activeIndex = todayIndex >= 0 ? todayIndex : 0;
    const activeDay = trip.itinerary[activeIndex] ?? firstDay;
    const followingDay = trip.itinerary[activeIndex + 1];
    eyebrow = activeDay
      ? `Día ${activeDay.dayNumber} de ${trip.itinerary.length}`
      : "En ruta";
    heading = activeDay?.title || `Hoy, ${trip.destination}`;
    summary =
      activeDay?.summary ||
      "El plan de hoy está listo; deja sitio para una sorpresa por el camino.";
    current = {
      title: activeDay?.title || trip.destination,
      detail: activeDay ? dayLabel(activeDay) : "Tu plan del día.",
    };
    next = activeDay?.stops.length
      ? stopDetail(activeDay)
      : {
          title: followingDay?.title || "Explorar sin prisa",
          detail: followingDay ? dayLabel(followingDay) : "El resto lo decide el viaje.",
        };
    progress = trip.itinerary.length
      ? Math.round(((activeIndex + 1) / trip.itinerary.length) * 100)
      : 0;
    target = activeDay ? `#dia-${activeDay.dayNumber}` : "#trip-top";
    action = activeDay ? "Ver el plan de hoy" : "Volver a la portada";
  }

  return (
    <section className="container-editorial trip-now-wrap" aria-labelledby="trip-now-title">
      <div className="trip-now-card">
        <div className="trip-now-card__intro">
          <p className="trip-now-card__eyebrow">{eyebrow}</p>
          <h2 id="trip-now-title">{heading}</h2>
          <p className="trip-now-card__summary">{summary}</p>
          <a href={target} className="trip-now-card__action">
            {action}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <div className="trip-progress" aria-hidden={progress === 0}>
            <div
              className="trip-progress__bar"
              role="progressbar"
              aria-label="Progreso del viaje"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            {progress > 0 && <span>{progress}% del viaje</span>}
          </div>
        </div>

        <div className="trip-now-card__moments">
          <article className="trip-moment">
            <p>Ahora</p>
            <h3>{current.title}</h3>
            <span>{current.detail}</span>
          </article>
          <article className="trip-moment trip-moment--next">
            <p>Después</p>
            <h3>{next.title}</h3>
            <span>{next.detail}</span>
          </article>
        </div>
      </div>
    </section>
  );
}
