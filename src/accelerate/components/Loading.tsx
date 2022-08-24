import React, { SVGProps } from 'react';

import './Loading.css';

type Props = {
    svgProps?: SVGProps<SVGSVGElement>,
    pathProps?: SVGProps<SVGPathElement>,
};

export default function Loading( props : Props ) {
    const {
        svgProps = {},
        pathProps = {},
    } = props;
    return (
        <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 243 226.8"
            xmlSpace="preserve"
            { ...svgProps }
            className={ `altis-svg-shape ${ svgProps.className || '' }` }
        >
            <path
                className="altis-shape"
                d="M22.05,38.81,220.44,3.86C218.63,8.77,159.21,169.94,155.18,181c-4.65,12.8-12.37,27.8-28.61,25.79A24.35,24.35,0,0,1,108,195.67a25.23,25.23,0,0,1-3.44-9.14c-2.78-15.74-19-97.66-61.12-134.4,0,0-12.11-10.52-21.4-13.32a40.15,40.15,0,0,0-7.84,3.09C-4.91,53.05,3.3,77.11,17.49,86,32,95,90.11,96.73,133.73,102.58s40.34,27.19,40.34,27.19l-2.51,6.8c-3.27,7.54-20.31,15.69-29.16-2.47S132.06,53.44,87.69,27.24"
                { ...pathProps }
            />
        </svg>
    );
};
