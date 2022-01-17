import React from 'react';

import { compactMetric } from '../../util';

import './Dashboard.scss';

type Props = {
	delta?: number | null,
	description?: string,
	title: string,
	stat?: number,
};

export default function Insight( props: Props ) {
	return (
		<div className="key-insight dashboard-shadow">
			<div className="key-insight-content">
				<div className="key-insight-head">
					{ props.title }
				</div>
				<div className="key-insight-metrics">
					<div className="metrics-aggregate">{ compactMetric( props.stat || 0 ) }</div>
					{ !! props.delta && ! isNaN( props.delta ) && (
						<div className={ `metrics-delta score-${ props.delta >= 0 ? 'pos' : 'neg' }` }>
							{ props.delta >= 0 ? '↑' : '↓' }
							{ compactMetric( parseFloat( props.delta.toFixed( 20 ) ) ) }
						</div>
					) }
				</div>
				<div className="key-insight-desc">
					{ props.description }
				</div>
			</div>
		</div >
	)
}
