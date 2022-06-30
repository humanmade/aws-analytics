import React, { useState, useEffect } from 'react';
import { __, sprintf } from '@wordpress/i18n';

import { useSelect } from '@wordpress/data';
import { extent, max } from 'd3-array';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { LinePath, AreaClosed } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleTime, scaleLinear } from '@visx/scale';
import { MarkerCircle } from '@visx/marker';
import { periods } from '../../data/periods';
import { Duration, Filter, StatsResult } from '../../util';

import './Dashboard.scss';

type Props = {
	period?: Duration,
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
    } = props;

    // Get stats data.
    const [ filter, setFilter ] = useState<Filter>( {} );
    const [ outerWidth, setOuterWidth ] = useState<number>( 0 );
	const data = useSelect<StatsResult>( select => {
		return select( 'altis/analytics' ).getStats( {
			filter,
			period,
            interval: '4h',
		} );
	}, [ filter, period ] );

    const uniques : Datum[] = Object.entries( data?.by_interval || {} ).map( ( [ time, stats ] ) => {
        return {
            time: new Date( time ),
            uniques: stats.visitors,
            views: stats.views,
        };
    } );

    useEffect( () => {
        setOuterWidth( document.getElementById( 'hero-chart' )?.offsetWidth || 600 );
    }, [ outerWidth, data ] );

    const xScale = scaleTime<number>( {
        domain: extent( uniques, getX ) as [ Date, Date ],
        nice: true,
    } );
    const yScale = scaleLinear<number>( {
        domain: [ 0, max( uniques, getY ) as number + Math.floor( max( uniques, getY ) as number / 5 ) ],
        nice: true,
    } );

    xScale.range( [ 0, outerWidth - 250 ] );
    yScale.range( [ 250, 0 ] );

	return (
		<div className="HeroChart" id="hero-chart">
            <svg width="100%" height={ 350 }>
                <MarkerCircle id="marker-circle" fill="#333" size={2} refX={2} />
                <LinearGradient
                    from="var( --wp-admin-theme-color )"
                    to="rgba( 255, 255, 255, 0 )"
                    id="hero-gradient"
                />
                <Group left={ 150 } top={ 25 } height={ 300 }>
                    <AxisBottom
                        hideAxisLine={ true }
                        hideTicks={ true }
                        scale={ xScale }
                        top={ 260 }
                        numTicks={ 7 }
                        tickLabelProps={ ( value ) => ( {
                            verticalAnchor: 'middle',
                            textAnchor: 'middle',
                            fontSize: 13,
                            style: { textTransform: 'uppercase' },
                            fill: '#777',
                        } ) }
                    />
                    <AxisLeft
                        hideAxisLine={ true }
                        hideTicks={ true }
                        hideZero={ true }
                        scale={ yScale }
                        left={ -30 }
                        numTicks={ 4 }
                        label={ __( 'Visitor Count', 'altis-analytics' ) }
                        labelOffset={ 50 }
                        labelProps={ {
                            verticalAnchor: 'middle',
                            textAnchor: 'middle',
                            fontSize: 13,
                            fontWeight: 'bold',
                            style: { textTransform: 'uppercase' },
                            fill: '#777',
                        } }
                    />
                    <GridRows
                        scale={ yScale }
                        stroke="rgba( 0, 0, 0, .3 )"
                        width={ outerWidth - 190 }
                        numTicks={ 4 }
                        left={ -30 }
                    />
                    <LinePath
                        curve={ curveMonotoneX }
                        data={ uniques }
                        x={ d => xScale( getX( d ) ) ?? 0 }
                        y={ d  => yScale( getY( d ) ) ?? 0 }
                        stroke="var( --wp-admin-theme-color )"
                        strokeWidth={ 2 }
                        strokeOpacity={ 1 }
                        shapeRendering="geometricPrecision"
                    />
                    <AreaClosed
                        curve={ curveMonotoneX }
                        data={ uniques }
                        x={ d => xScale( getX( d ) ) ?? 0 }
                        y={ d  => yScale( getY( d ) ) ?? 0 }
                        yScale={ yScale }
                        strokeWidth={ 0 }
                        strokeOpacity={ 1 }
                        shapeRendering="geometricPrecision"
                        fill="url(#hero-gradient)"
                        opacity={ 0.3 }
                    />
                </Group>
            </svg>
		</div>
	)
}
