import React, { useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { useSelect } from '@wordpress/data';
import { extent, max } from 'd3-array';
import { curveNatural } from '@visx/curve';
import { Group } from '@visx/group';
import { LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { MarkerArrow, MarkerCross, MarkerX, MarkerCircle, MarkerLine } from '@visx/marker';
import { periods } from '../../data/periods';
import { Duration, Filter, StatsResult } from '../../util';

import './Dashboard.scss';

type Props = {
	name: string,
	period?: Duration,
	canViewAnalytics: boolean,
	canViewInsights: boolean,
	onSetPeriod?: ( value: Duration ) => void,
};

type Datum = {
    time: Date,
    uniques: number,
    views: number,
};

const getX = ( d : Datum ) => d.time;
const getY = ( d : Datum ) => d.uniques;

export default function HeroChart( props: Props ) {
    const {
        period,
        onSetPeriod,
    } = props;

    // Get stats data.
    const [ filter, setFilter ] = useState<Filter>( {} );
	const data = useSelect<StatsResult>( select => {
		return select( 'altis/analytics' ).getStats( {
			filter,
			period,
		} );
	}, [ filter, period ] );

    const uniques : Datum[] = Object.entries( data?.by_interval || {} ).map( ( [ time, stats ] ) => {
        return {
            time: new Date( time ),
            uniques: stats.visitors,
            views: stats.views,
        };
    } );


    const xScale = scaleTime<number>( {
        domain: extent( uniques, getX ) as [ Date, Date ],
    } );
    const yScale = scaleLinear<number>( {
        domain: [ 0, max( uniques, getY ) as number ],
    } );

	return (
		<div className="HeroChart">
            <svg width="100%" height={ 300 }>
                <MarkerX
                    id="marker-x"
                    stroke="#333"
                    size={22}
                    strokeWidth={4}
                    markerUnits="userSpaceOnUse"
                />
                <MarkerCross
                    id="marker-cross"
                    stroke="#333"
                    size={22}
                    strokeWidth={4}
                    strokeOpacity={0.6}
                    markerUnits="userSpaceOnUse"
                />
                <MarkerCircle id="marker-circle" fill="#333" size={2} refX={2} />
                <MarkerArrow id="marker-arrow-odd" stroke="#333" size={8} strokeWidth={1} />
                <MarkerLine id="marker-line" fill="#333" size={16} strokeWidth={1} />
                <MarkerArrow id="marker-arrow" fill="#333" refX={2} size={6} />
                <rect width="100%" height={ 300 } fill="#efefef" rx={14} ry={14} />
                {/* <Group top={ 0 } left={ 0 }> */}
                    { uniques.map( ( d, j ) => (
                        <circle
                            key={ j }
                            r={ 3 }
                            cx={ xScale(getX(d)) }
                            cy={ yScale(getY(d)) }
                            stroke="rgba(33,33,33,0.5)"
                            fill="transparent"
                        />
                    ) ) }
                    <LinePath
                        curve={ curveNatural }
                        data={ uniques }
                        x={ d => xScale( getX( d ) ) ?? 0 }
                        y={ d  => yScale( getY( d ) ) ?? 0 }
                        stroke="#333"
                        strokeWidth={ 2 }
                        strokeOpacity={ 1 }
                        shapeRendering="geometricPrecision"
                        markerMid="url(#marker-circle)"
                        markerStart="url(#marker-line)"
                        markerEnd="url(#marker-line)"
                    />
                {/* </Group> */}
            </svg>
		</div>
	)
}
