import React from 'react';

import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { __, sprintf, _n } from '@wordpress/i18n';

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
};

const getX = ( d : Datum ) => d.index;
const getY = ( d : Datum ) => d.count;

export default function SparkChart( props: Props ) {
	const {
		histogram,
		width = 180,
		height = 20,
	} = props;

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
		padding: Math.min( 1 / histogram.length, 0.1 ),
		range: [ 0, width ],
	} );
	const yScale = scaleLinear<number>( {
		domain: [ 0, yMax as number ],
		range: [ 0, height ],
	} );

	yScale.range( [ height, 0 ] );

	return (
		<svg width={ width } height={ height }>
			{ histogram.map( d => {
				const barWidth = xScale.bandwidth();
				const barHeight = height - ( yScale( getY( d ) ) ?? 1 );
				const barX = xScale( getX( d ) );
				const barY = Math.max( height - barHeight - 1, 0 );
				return (
					<Bar
						key={ `bar-${ d.index }` }
						x={ barX }
						y={ barY }
						rx={ 2 }
						width={ barWidth }
						height={ barHeight + 10 }
						fill={ d.zeroData ? '#d2d5d7' : 'var( --wp-admin-theme-color )' }
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
