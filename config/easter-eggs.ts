export type EasterEgg = {
  id: string;
  image: string;
  alt: string;
  title: string;
  message: string;
  /** Sustituye `#` por el enlace que quieras abrir. */
  href: string;
  placement: "loading" | "trip" | "footer";
};

/**
 * Cambia aquí textos, imágenes y enlaces de los secretos de Amanda.
 * Las imágenes están en /public/stickers; puedes reemplazarlas conservando el nombre.
 */
export const EASTER_EGGS: EasterEgg[] = [
  {
    id: "coffee-detective",
    image: "/stickers/coffee-detective.png",
    alt: "Taza de café detective con una tarjeta de embarque",
    title: "El café ya abrió una investigación",
    message: "Ha revisado quince hojas y exige custodia de testigos. Yo le dije que eso se llama desayuno.",
    href: "#",
    placement: "loading",
  },
  {
    id: "powerlifting-cow",
    image: "/stickers/powerlifting-cow.png",
    alt: "Vaca powerlifter abrazando una barra",
    title: "Descanso entre series: jurídicamente dudoso",
    message: "Amanda levanta la barra. Yo levanto la moral y después presento una factura emocional completamente inventada.",
    href: "#",
    placement: "trip",
  },
  {
    id: "tragic-book",
    image: "/stickers/tragic-book.png",
    alt: "Libro exhausto con una rosa y un marcapáginas fúnebre",
    title: "El libro sobrevivió al itinerario",
    message: "Tiene energía de Shirley Jackson después de hacer sentadillas. Ábrelo bajo tu propia responsabilidad literaria.",
    href: "#",
    placement: "footer",
  },
];

export function easterEggFor(placement: EasterEgg["placement"]): EasterEgg | undefined {
  return EASTER_EGGS.find((item) => item.placement === placement);
}
