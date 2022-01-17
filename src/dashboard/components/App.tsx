import React, { useState } from 'react';
import { createSlotFill } from '@wordpress/components';
import { useSelect } from '@wordpress/data';

import Browsers from './Browsers';
import Country from './Country';
import Devices from './Devices';
import Header from './Header';
import Referrers from './Referrers';
import Searches from './Searches';
import Summary from './Summary';
import TopUrls from './TopUrls';
import TrafficGraph from './TrafficGraph';
import { BlockFillProps, Filter, SelectableDate, StatsResult } from '../util';
import { resolveSelectedDate } from '../data';

import './App.css';

const BlockSlotFill = createSlotFill( 'Altis.Analytics.StatsBlock' );

export const BlockFill = BlockSlotFill.Fill;

export default function App() {

	const [ filter, setFilter ] = useState<Filter>( {} );
	const [ period, setPeriod ] = useState<SelectableDate>( 'P7D' );
	const data = useSelect<StatsResult>( select => {
		return select( 'altis/analytics' ).getStats( {
			filter,
			period,
		} );
	}, [ filter, period ] );

	const blockFillProps: BlockFillProps = {
		data,
		onUpdateFilter: setFilter, // callback => this.setState( state => ( { filter: callback( state.filter ) } ) ),
	};

	return (
		<main className="App">
			<Header
				filter={ filter }
				period={ period }
				onChangePeriod={ setPeriod }
				onRefresh={ () => setFilter( {
					...filter,
					time: Date.now(),
				} ) }
				onUpdateFilter={ setFilter }
			/>

			<Summary
				data={ data }
			/>

			<TrafficGraph
				data={ data }
				period={ resolveSelectedDate( period, null ) }
			/>

			<div className="App__blocks App__blocks--three">
				<BlockSlotFill.Slot
					fillProps={ blockFillProps }
				/>

				<BlockFill>
					{ ( props: BlockFillProps ) => <TopUrls { ...props } /> }
				</BlockFill>
				<BlockFill>
					{ ( props: BlockFillProps ) => <Searches { ...props } /> }
				</BlockFill>
				<BlockFill>
					{ ( props: BlockFillProps ) => <Country { ...props } /> }
				</BlockFill>
				<BlockFill>
					{ ( props: BlockFillProps ) => <Referrers { ...props } /> }
				</BlockFill>
				<BlockFill>
					{ ( props: BlockFillProps ) => <Devices { ...props } /> }
				</BlockFill>
				<BlockFill>
					{ ( props: BlockFillProps ) => <Browsers { ...props } /> }
				</BlockFill>
			</div>
		</main>
	);
}
