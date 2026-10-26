import { useEffect } from "react"

import "./LogoIntro.css"

export default function LogoIntro({ onFinish }) {

    useEffect(() => {

        if (!onFinish) return

        const timer = setTimeout(() => {
            onFinish()
        }, 5200)

        return () => clearTimeout(timer)

    }, [onFinish])


    return (

        <div className="logo-intro">

            <div className="paper">


                {/* ==================================================
                    LÁPIS
                ================================================== */}

                <div className="pencil">

                    <svg
                        viewBox="0 0 180 60"
                        xmlns="http://www.w3.org/2000/svg"
                    >

                        <g transform="rotate(-18 90 30)">

                            {/* corpo */}

                            <rect
                                x="18"
                                y="16"
                                width="122"
                                height="28"
                                rx="5"
                                fill="#E4B94F"
                            />

                            {/* brilho do lápis */}

                            <rect
                                x="22"
                                y="19"
                                width="112"
                                height="6"
                                rx="3"
                                fill="#F5D77A"
                                opacity="0.65"
                            />

                            {/* faixa */}

                            <rect
                                x="43"
                                y="16"
                                width="11"
                                height="28"
                                fill="#C99D31"
                            />

                            {/* borracha / metal */}

                            <rect
                                x="140"
                                y="16"
                                width="18"
                                height="28"
                                fill="#D9DDE2"
                            />

                            <rect
                                x="140"
                                y="19"
                                width="18"
                                height="4"
                                fill="#FFFFFF"
                                opacity="0.5"
                            />

                            {/* madeira */}

                            <polygon
                                points="158,16 178,30 158,44"
                                fill="#E8C29B"
                            />

                            {/* grafite */}

                            <polygon
                                points="173,26 180,30 173,34"
                                fill="#20242A"
                            />

                        </g>

                    </svg>

                </div>


                {/* ==================================================
                    ÁREA DA LOGO
                ================================================== */}

                <div className="draw-area">


                    {/* escrita a lápis */}

                    <span className="sketch-logo">
                        START_UP
                    </span>


                    {/* logo final */}

                    <div className="final-logo">

                        START_UP

                    </div>


                    {/* pequena sombra projetada */}

                    <div className="logo-ground-shadow"></div>

                </div>


                {/* ==================================================
                    MÃO + PINCEL
                ================================================== */}

                <div className="hand">

                    <svg
                        viewBox="0 0 180 180"
                        xmlns="http://www.w3.org/2000/svg"
                    >

                        <g transform="rotate(-18 90 90)">

                            <path
                                d="
                                    M55 145
                                    C40 130 37 108 45 90

                                    L58 53
                                    C61 45 69 42 75 46
                                    C81 49 83 57 80 64

                                    L72 88

                                    L87 45
                                    C90 37 99 35 105 39
                                    C112 43 113 50 110 58

                                    L101 87

                                    L114 52
                                    C117 44 126 42 132 46
                                    C138 50 140 57 137 64

                                    L125 94

                                    L139 72
                                    C143 66 151 65 157 69
                                    C164 74 165 82 161 89

                                    L140 125

                                    C130 143 113 153 94 155

                                    Z
                                "
                                fill="#E8B994"
                            />

                            {/* brilho sutil da pele */}

                            <path
                                d="
                                    M59 136
                                    C53 123 54 108 59 94
                                "
                                fill="none"
                                stroke="#F7D5BB"
                                strokeWidth="4"
                                strokeLinecap="round"
                                opacity="0.6"
                            />

                            {/* dobra */}

                            <path
                                d="
                                    M65 145
                                    C77 153 91 157 104 153
                                "
                                fill="none"
                                stroke="#BD8D70"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                        </g>

                    </svg>


                    {/* pincel */}

                    <div className="brush">

                        <span></span>

                    </div>

                </div>


                {/* ==================================================
                    PEQUENA MARCA DE TINTA
                ================================================== */}

                <div className="paint-drop paint-drop-1"></div>
                <div className="paint-drop paint-drop-2"></div>

            </div>

        </div>
    )
}