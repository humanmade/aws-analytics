import React from 'react';

import { max } from 'd3-array';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';

type Props = {
	histogram: { index: number, count: number }[],
	maxViews?: number,
	width?: number,
	height?: number,
};

type Datum = {
	index: number,
	count: number,
};

const getX = ( d : Datum ) => d.index;
const getY = ( d : Datum ) => d.count;

export default function SparkChart( props: Props ) {
	const {
		histogram,
		width = 180,
		height = 30,
	} = props;

	const yMax = max( histogram, getY ) as number || 0;
	const xScale = scaleBand<number>( {
		domain: histogram.map( getX ),
		padding: 1 / histogram.length,
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
				const barHeight = height - ( yScale( getY( d ) ) ?? 0 );
				const barX = xScale( getX( d ) );
				const barY = height - barHeight;
				return (
					<Bar
						key={ `bar-${ d.index }` }
						x={ barX }
						y={ barY }
						rx={ 2 }
						width={ barWidth }
						height={ barHeight }
						fill="var( --wp-admin-theme-color )"
						fillOpacity={ 0.8 }
					/>
				);
			} ) }
		</svg>
	);
}
