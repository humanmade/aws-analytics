import React, { useCallback, useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import moment from 'moment';

import { useSelect } from '@wordpress/data';
import { extent, max, bisector } from 'd3-array';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleLinear, scaleTime, scaleUtc } from '@visx/scale';
import { MarkerCircle } from '@visx/marker';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { periods } from '../../data/periods';
import { compactMetric, Duration, padLeft, StatsResult } from '../../util';

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
const bisectDate = bisector<Datum, Date>( d => d.time ).left;

const getTooltip = ( data : Datum, period : { interval: string } ) => {
	const date = getX( data );
	let dateString = moment( date ).format( 'MMM Do' );

	let isIntervalHours = period.interval.match( /(\d)h/ );
	let intervalHours = Number( isIntervalHours ? isIntervalHours[1] : 0 );

	if ( intervalHours === 1 ) {
		dateString = `${ padLeft( date.getUTCHours() ) }:00`;
	} else if ( intervalHours ) {
		const offset = date.getUTCHours() + intervalHours;
		const wrappedOffset = offset < 24 ? offset : 0;
		dateString = `${ padLeft( date.getUTCHours() ) }:00 — ${ padLeft( wrappedOffset ) }:00`;
	}

	return (
		<span>
			<strong>{ compactMetric( data.uniques ) }</strong>
			{ ' ' }
			<small><time dateTime={ date.toISOString() }>{ `${ dateString }` }</time></small>
		</span>
	);
};

export default function HeroChart( props: Props ) {
	const {
		period: periodKey,
	} = props;

	const period = periods.find( p => p.value === periodKey );

	// Get stats data.
	const [ outerWidth, setOuterWidth ] = useState<number>( 0 );
	const data = useSelect<StatsResult>( select => {
		return select( 'accelerate' ).getStats( {
			period: period?.value || 'P7D',
			interval: period?.interval || '2h',
		} );
	}, [ period ] );

	const uniques : Datum[] = Object.entries( data?.by_interval || {} ).map( ( [ time, stats ] ) => {
		const date = new Date( time );
		const dateNow = new Date();
		return {
			time: date < dateNow ? date : dateNow,
			uniques: stats.visitors,
			views: stats.views,
		};
	} );

	useEffect( () => {
		setOuterWidth( document.getElementById( 'hero-chart' )?.offsetWidth || 600 );
	}, [ outerWidth, data ] );

	const xScale = scaleUtc<number>( {
		domain: extent( uniques, getX ) as [ Date, Date ],
	} );
	const yScale = scaleLinear<number>( {
		domain: [ 0, Math.max( 4, max( uniques, getY ) as number + Math.floor( max( uniques, getY ) as number / 6 ) ) ],
		nice: true,
	} );

	const graphHeight = 250;
	const offsetleft = 150;
	const graphPaddingX = 30;
	const graphPaddingY = 50;
	const outerWidthWithOffset = Math.max( 0, outerWidth - graphHeight );

	xScale.range( [ 0, outerWidthWithOffset ] );
	yScale.range( [ graphHeight, 0 ] );

	const {
		showTooltip,
		hideTooltip,
		tooltipData,
		tooltipTop = 0,
		tooltipLeft = 0,
	} = useTooltip();


	const handleTooltip = useCallback(
		( event: React.TouchEvent<SVGGElement> | React.MouseEvent<SVGGElement> ) => {
		  const { x } = localPoint( event ) || { x: 0 };
		  const x0 = xScale.invert( x - offsetleft );
		  const index = bisectDate( uniques, x0, 1 );
		  const d0 = uniques[ index - 1 ];
		  const d1 = uniques[ index ];
		  let d = d0;
		  if ( d1 && getX( d1 ) ) {
			d = x0.valueOf() - getX( d0 ).valueOf() > getX( d1 ).valueOf() - x0.valueOf() ? d1 : d0;
		  }
		  showTooltip( {
			tooltipData: d,
			tooltipLeft: x - offsetleft,
			tooltipTop: yScale( getY( d ) ),
		  } );
		},
		[ showTooltip, yScale, xScale ],
	);

	return (
		<div className="HeroChart" id="hero-chart">
			<svg width="100%" height={ graphHeight + ( graphPaddingY * 2 ) }>
				<MarkerCircle id="marker-circle" fill="#333" size={ 2 } refX={ 2 } />
				<LinearGradient
					from="var( --wp-admin-theme-color )"
					to="rgba( 255, 255, 255, 0 )"
					id="hero-gradient"
				/>
				<Group
					left={ offsetleft }
					top={ graphPaddingY / 2 }
					height={ graphHeight + graphPaddingY }
				>
					<AxisBottom
						hideAxisLine={ true }
						hideTicks={ true }
						scale={ xScale }
						top={ graphHeight + 10 }
						numTicks={ 7 }
						tickLabelProps={ () => ( {
							verticalAnchor: 'middle',
							textAnchor: 'middle',
							fontSize: 11,
							style: { textTransform: 'uppercase' },
							fill: '#777',
						} ) }
						tickFormat={ value => {
							const date = new Date( value as Date );
							return `${ padLeft( date.getUTCDate() ) }.${ padLeft( date.getUTCMonth() + 1 ) }`;
						} }
					/>
					<AxisLeft
						hideAxisLine={ true }
						hideTicks={ true }
						hideZero={ true }
						scale={ yScale }
						left={ -graphPaddingX }
						numTicks={ 4 }
						label={ __( 'Visitor Count', 'altis-analytics' ) }
						labelOffset={ 50 }
						labelProps={ {
							verticalAnchor: 'middle',
							textAnchor: 'middle',
							fontSize: 13,
							fontWeight: 'normal',
							letterSpacing: '0.1em',
							style: { textTransform: 'uppercase' },
							fill: '#777',
						} }
						tickLabelProps={ () => ( {
							verticalAnchor: 'middle',
							textAnchor: 'end',
							fontSize: 11,
							fill: '#777',
						} ) }
						tickFormat={ value => {
							return compactMetric( value as number );
						} }
					/>
					<GridRows
						scale={ yScale }
						stroke="rgba( 0, 0, 0, .2 )"
						width={ outerWidthWithOffset + ( graphPaddingX * 2 ) }
						numTicks={ 4 }
						left={ -graphPaddingX }
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
					<Bar
						x={ 0 }
						y={ 0 }
						width={ outerWidthWithOffset }
						height={ graphHeight }
						fill="transparent"
						onMouseLeave={ () => hideTooltip() }
					/>
					<GridColumns
						scale={ xScale }
						x={ 0 }
						y={ 0 }
						width={ outerWidthWithOffset }
						height={ graphHeight }
						stroke="transparent"
						strokeWidth={ 2 }
						fill="transparent"
						rx={ 14 }
						numTicks={ uniques.length }
						onTouchStart={ handleTooltip }
						onTouchMove={ handleTooltip }
						onMouseMove={ handleTooltip }
					/>
					{ tooltipData && (
						<g>
							<circle
								cx={ tooltipLeft }
								cy={ tooltipTop + 1 }
								r={ 4 }
								fill="black"
								fillOpacity={ 0.1 }
								stroke="black"
								strokeOpacity={ 0.1 }
								strokeWidth={ 2 }
								pointerEvents="none"
							/>
							<circle
								cx={ tooltipLeft }
								cy={ tooltipTop }
								r={ 4 }
								fill="var( --wp-admin-theme-color )"
								stroke="white"
								strokeWidth={ 2 }
								pointerEvents="none"
							/>
						</g>
					)}
				</Group>
			</svg>
			{ tooltipData && (
				<div>
					<TooltipWithBounds
						key={ Math.random() }
						top={ tooltipTop - 12 }
						left={ tooltipLeft + 6 + offsetleft }
					>
						{ getTooltip( tooltipData as Datum, period as { interval : string } ) }
					</TooltipWithBounds>
				</div>
			) }
		</div>
	)
}
