import { Attire } from "../lib/definitions";

export const sampleAttire: Attire = {
    name: "Classic Blue Shirt",
    images: [
        { src: "/image_1.webp", alt: "Front view of blue shirt" },
        { src: "/image_2.webp", alt: "Back view of blue shirt" },
    ],
    vendor: "FashionCo",
    available_shirt_sizes: { S: 10, M: 20, L: 15, XL: 5 },
    available_pant_sizes: { 30: 8, 32: 5, 34: 3 },
    price: 49.99,
};
