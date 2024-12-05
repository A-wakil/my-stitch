import Image from "next/image";

export type Attire = {
    name: string; 
    images: { src: string; alt: string }[]; 
    vendor: string; 
    available_shirt_sizes: { [size in "S" | "M" | "L" | "XL"]: number }; 
    available_pant_sizes: { [size: number]: number }; 
    price: number; 
};

