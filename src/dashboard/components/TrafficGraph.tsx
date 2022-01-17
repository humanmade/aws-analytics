import moment from 'moment';
import React from 'react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	Tooltip,
	TooltipProps,
	YAxis,
} from 'recharts';
import { AnimationTiming } from 'recharts/types/util/types';
import { __ } from '@wordpress/i18n';

import './TrafficGraph.css';
import { Period, StatsResult } from '../util';

const formatDate = ( date: string | Date ) => moment( date ).format( 'MMM Do' );

const CustomTooltip = ( { active, payload, label, ...rest }: TooltipProps<number, string> ) => {
	if ( ! active || ! payload ) {
		return null;
	}

	// @ts-ignore
	const item = payload[0].payload;

	return (
		<div className="TrafficGraph__tooltip">
			<h3>{ formatDate( label ) }</h3>
			<dl
				className="TrafficGraph__tooltip-value TrafficGraph__tooltip-visitors"
			>
				<dt>Uniques</dt>
				<dd>{ item.visitors }</dd>
			</dl>
			<dl
				className="TrafficGraph__tooltip-value TrafficGraph__tooltip-views"
			>
				<dt>Views</dt>
				<dd>{ item.views }</dd>
			</dl>
		</div>
	);
};

const MAX_TICKS = 20;

interface Props {
	data?: StatsResult,
	period: Period,
}

export default function TrafficGraph( props: Props ) {
	const { data, period } = props;
	if ( ! data ) {
		return null;
	}

	const start = moment( period.start );
	const end = moment( period.end );
	const numDays = end.diff( start, 'days' ) + 1;
	const formattedData = [];
	for ( let i = 0; i < numDays; i++ ) {
		const day = moment( start ).add( i, 'days' );
		const dayData = data.by_interval[ day.format( 'Y-MM-DD' ) ];
		formattedData.push( {
			date: day.valueOf(),
			views: ( dayData ? dayData.views : 0 ) || 0,
			visitors: ( dayData ? dayData.visitors : 0 ) || 0,
			nonunique: ( dayData ? dayData.views - dayData.visitors : 0 ) || 0,
		} );
	}

	const tickInterval = Math.floor( numDays / MAX_TICKS );
	const barWidth = 800 / numDays;

	return (
		<div className="TrafficGraph">
			<ResponsiveContainer
				width="100%"
				height={ 300 }
			>
				<BarChart
					barGap={ -0.8 * barWidth }
					data={ formattedData }
				>
					<CartesianGrid
						stroke="#DFE2E7"
						strokeDasharray="3 3"
						vertical={ false }
					/>

					<XAxis
						allowDataOverflow
						dataKey="date"
						domain={ [ start.valueOf(), end.valueOf() ]}
						interval={ tickInterval }
						padding={ {
							left: barWidth,
							right: 0,
						} }
						scale="time"
						stroke="#5B6983"
						tick={ { fill: '#152A4E' } }
						tickCount={ numDays }
						tickFormatter={ formatDate }
						// tickMargin={ 10 }
						type="number"
					/>
					<YAxis
						stroke="#DFE2E7"
						tick={ { fill: '#152A4E' } }
						width={ 40 }
					/>

					<Tooltip
						content={ CustomTooltip }
						animationEasing={ false as unknown as AnimationTiming }
						position={ { x: 'auto' as unknown as number, y: 0 } }
					/>

					<Bar
						barSize={ barWidth }
						dataKey="views"
						fill="#4667DE"
					/>
					<Bar
						barSize={ barWidth * 0.6 }
						dataKey="visitors"
						fill="#152A4E"
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
