import React, { useState } from 'react';

import Hero from './Hero';
import Overview from './Overview';
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
			<Hero
				name={ props.user.name }
				period={ period }
				onSetPeriod={ value => setPeriod( value ) }
			/>
			<Overview period={ period } />
			<List
				period={ period }
				postTypes={ props.postTypes }
				user={ props.user }
			/>
		</div>
	)
}
