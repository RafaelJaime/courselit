/**
 * Social proof shown on the membership checkout. Every path is served by the
 * same domain as the checkout (the static sales landing lives under
 * /landing/), so nothing is hosted twice. Keep filenames in sync with
 * projects/fitleads-academia/landing/assets in the membership repo.
 */
const TESTIMONIALS_BASE = "/landing/assets/testimonios";
const CLIENTS_BASE = "/landing/assets/clientes";

export interface CheckoutTestimonial {
    handle: string;
    video: string;
    poster: string;
}

function testimonial(handle: string, file: string): CheckoutTestimonial {
    return {
        handle,
        video: `${TESTIMONIALS_BASE}/${file}.mp4`,
        poster: `${TESTIMONIALS_BASE}/${file}.webp`,
    };
}

export const CHECKOUT_TESTIMONIALS: CheckoutTestimonial[] = [
    testimonial("@ramses_rams", "rams"),
    testimonial("@carlosgomezillan", "gomez"),
    testimonial("@canviant_vides", "canviant"),
    testimonial("@exclusive.luxurycars", "exclusive"),
    testimonial("@magfe_entrenadorpersonal", "magfe"),
    testimonial("@marseliusss", "marselius"),
];

/** Instagram handles; each one maps to `${CLIENTS_BASE}/<handle>.webp`. */
export const CHECKOUT_CLIENT_HANDLES: string[] = [
    "yarishna",
    "criscanaria5",
    "ramses_rams",
    "sariadnapascual",
    "entrena_con_conciencia",
    "soywillcoach",
    "carlosgomezillan",
    "cristinacastro5",
    "fedeguevara__",
    "gorilangel",
    "hector.defez.ifbb.pro",
    "ifbb_pro_spain",
    "esneider91",
    "emilio_martinez_romero",
    "raulromeronutri",
    "marseliusss",
    "adrix_fit",
    "arthur_oldschool2",
    "danielpereira_coach",
    "davidruizfitness",
    "mikelhellboy",
    "pablohybrido",
    "larracoach",
    "sr_buda",
];

export function clientAvatar(handle: string): string {
    return `${CLIENTS_BASE}/${handle}.webp`;
}
