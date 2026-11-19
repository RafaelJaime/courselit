"use client";

import { useState } from "react";
import {
    CHECKOUT_CLIENTS_HEADING,
    CHECKOUT_PLAY_TESTIMONIAL_PREFIX,
    CHECKOUT_TESTIMONIALS_HEADING,
} from "@ui-config/strings";
import {
    CHECKOUT_CLIENT_HANDLES,
    CHECKOUT_TESTIMONIALS,
    CheckoutTestimonial,
    clientAvatar,
} from "./checkout-social-proof-config";

function TestimonialCard({ item }: { item: CheckoutTestimonial }) {
    const [playing, setPlaying] = useState(false);

    return (
        <figure className="relative m-0 aspect-[9/16] w-[44%] min-w-[150px] max-w-[190px] shrink-0 snap-start overflow-hidden rounded-3xl border bg-black">
            {playing ? (
                <video
                    src={item.video}
                    poster={item.poster}
                    controls
                    autoPlay
                    playsInline
                    preload="none"
                    aria-label={`Testimonio de ${item.handle}`}
                    className="h-full w-full object-cover"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`${CHECKOUT_PLAY_TESTIMONIAL_PREFIX} ${item.handle}`}
                    className="group relative block h-full w-full"
                >
                    <img
                        src={item.poster}
                        alt=""
                        width={480}
                        height={854}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                    />
                    <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-transform group-hover:scale-105"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                            fill="currentColor"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </span>
                </button>
            )}
            <figcaption className="pointer-events-none absolute inset-x-0 top-0 truncate bg-gradient-to-b from-black/80 to-transparent px-3 pb-6 pt-3 text-xs font-semibold text-white">
                {item.handle}
            </figcaption>
        </figure>
    );
}

export function CheckoutSocialProof() {
    return (
        <section className="space-y-8 pt-4">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                    {CHECKOUT_TESTIMONIALS_HEADING}
                </h2>
                <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:snap-none lg:overflow-visible">
                    {CHECKOUT_TESTIMONIALS.map((item) => (
                        <TestimonialCard key={item.handle} item={item} />
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                    {CHECKOUT_CLIENTS_HEADING}
                </h2>
                <ul className="flex flex-wrap gap-3">
                    {CHECKOUT_CLIENT_HANDLES.map((handle) => (
                        <li key={handle}>
                            <img
                                src={clientAvatar(handle)}
                                alt=""
                                width={56}
                                height={56}
                                loading="lazy"
                                decoding="async"
                                className="h-14 w-14 rounded-full border object-cover"
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
