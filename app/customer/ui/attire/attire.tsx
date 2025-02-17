import { Attire } from "../../lib/definitions";
import Image from "next/image";
import "./attire.css"
import { useState } from "react";


export default function AttireWrapper({ attire }: { attire: Attire }) {

    return (
        <div>
            <div></div>
            <div>
                {attire.images.map((image, index) => (
                    <Image
                        key={index}
                        src={image.src}
                        alt={image.alt}
                        width={200} // Example width
                        height={200} // Example height
                    />
                ))}
            </div>
            <div>
                <h2>{attire.name}</h2>
                <p>Price: ${attire.price.toFixed(2)}</p>
                <p>Vendor: {attire.vendor}</p>
            </div>
            <div>
                <h3>Available Sizes:</h3>
                <ul>
                    {Object.entries(attire.available_shirt_sizes).map(([size, quantity]) => (
                        <li key={size}>
                            {size}: {quantity} in stock
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}