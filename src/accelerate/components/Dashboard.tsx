import React, { useState } from 'react';

import HeroChart from './HeroChart';
import List from './List';
import { Duration, InitialData } from '../../util';

import './Dashboard.scss';

interface Props {
	postTypes: InitialData['postTypes'],
	tracking: InitialData['tracking'],
	user: InitialData['user'],
}

export default function Dashboard( props: Props ) {
	const [ period, setPeriod ] = useState<Duration>( 'P7D' );

	return (
		<div className="Dashboard">
			<HeroChart
				period={ period }
			/>
			<List
				period={ period }
				postTypes={ props.postTypes }
				user={ props.user }
				onSetPeriod={ setPeriod }
			/>
		</div>
	)
}
