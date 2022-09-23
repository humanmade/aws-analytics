import React from 'react';
import moment from 'moment';

import { max, min } from 'd3-array';
import { scaleBand, scaleLog } from '@visx/scale';
import { Bar } from '@visx/shape';
import { __, sprintf, _n } from '@wordpress/i18n';
import { Duration } from '../../util';

type Datum = {
	index: number,
	count: number,
	zeroData?: boolean,
};

type Props = {
	histogram: Datum[],
	maxViews?: number,
	width?: number,
	height?: number,
	period?: Duration,
};

type Breakpoints = {
	[ k in Duration ]: number;
};

const getX = ( d : Datum ) => d.index;
const getY = ( d : Datum ) => d.count;

export default function SparkChart( props: Props ) {
	const breakPoints : Breakpoints = {
		'P7D': 100,
		'P14D': 110,
		'P30D': 120,
		'P1M': 120,
		'P60D': 135,
		'P90D': 150,
	};

	// Set up default empty histogram to allow for animations.
	const days = moment.duration( props.period ).asDays();

	let histogram : Datum[] = Array( days ).fill( {
		index: 0,
		count: 0,
	} );

	histogram.forEach( ( d, i ) => {
		histogram[i] = { index: i, count: 0 };
	} );

	if ( props.histogram.length > 0 ) {
		histogram = props.histogram;
	}

	const {
		width = 160,
		height = 20,
		maxViews,
		period = 'P7D',
	} = props;

	// Override width depending on number of days shown.
	const trueWidth = breakPoints[ period ] || width;

	const yMax = max( histogram, getY ) as number || 0;
	const yMin = min( histogram, getY ) as number || 0;

	// Pad numbers until we get data, always ensure they're less than real data values.
	const maxPadValue = Math.floor( ( yMin || Math.min( 10, yMax ) || 10 ) / 1.5 );
	for ( let i = 0; i < histogram.length; i++ ) {
		if ( histogram[i].count === 0 ) {
			histogram[i].zeroData = true;
			histogram[i].count = maxPadValue + 1 - Math.ceil( Math.random() * maxPadValue );
		} else {
			break;
		}
	}

	const xScale = scaleBand<number>( {
		domain: histogram.map( getX ),
		padding: Math.max( 1.5 / histogram.length, 0.15 ),
		range: [ 0, trueWidth ],
	} );
	const yScale = scaleLog<number>( {
		domain: [ 1, Math.max( 10, maxViews || yMax as number ) ],
		range: [ height, 0 ],
	} );

	return (
		<svg width={ trueWidth } height={ height }>
			{ histogram.map( ( d, i ) => {
				const barWidth = xScale.bandwidth();
				const barHeight = height + 1;
				const barX = xScale( getX( d ) );
				const barY = Math.min( ( yScale( getY( d ) as number || 1 ) ), height - 1 );
				return (
					<Bar
						key={ `bar-${ i }` }
						x={ barX }
						y={ barY }
						rx={ 1 }
						width={ barWidth }
						height={ barHeight + 10 }
						fill={ d.zeroData ? '#ECEEF1' : '#4667de' }
						fillOpacity={ 0.8 }
					>
						<title>{
							d.zeroData
								? __( 'No data for this date', 'altis' )
								: sprintf(
									'%d %s on %s',
									d.count,
									_n( 'View', 'Views', d.count, 'altis' ),
									( new Date( d.index ) ).toDateString()
								)
						}</title>
					</Bar>
				);
			} ) }
		</svg>
	);
}
