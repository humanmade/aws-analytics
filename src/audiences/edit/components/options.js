import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getEstimate } from '../data';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const { Button } = wp.components;
const { __ } = wp.i18n;

const StyledOptions = styled.div.attrs( () => ( {
	className: "audience-options"
} ) )`
	.audience-estimate {
		margin: 0 0 30px;
	}
`;

const Options = props => {
	const {
		audience,
	} = props;

	const [ estimate, setEstimate ] = useState( { count: 0, histogram: [], total: 0 } );
	const fetchEstimate = () => {
		( async () => {
			const estimateResponse = await getEstimate( audience );
			setEstimate( estimateResponse );
		} )();
	};

	// Get initial estimate.
	useEffect( fetchEstimate, [ audience ] );

	return (
		<StyledOptions>
			<div className="audience-estimate">
				<h4>{ __( 'Audience Estimate', 'altis-analytics' ) }</h4>
				{ estimate.error && <div className="error msg">{ estimate.error.message }</div> }
				<p><strong>{ estimate.count }</strong> { __( 'in the last 7 days' ) }</p>
				{ estimate.total > 0 && <p><strong>{ Math.round( ( estimate.count / estimate.total ) * 100 ) }%</strong> { __( 'of total traffic', 'altis-analytics' ) }</p> }
				<Sparklines
					data={ estimate.histogram.map( item => item.count ) }
					preserveAspectRatio="xMidYMid meet"
				>
  					<SparklinesLine color="#4667de" />
				</Sparklines>
			</div>

			<Button
				isLarge={ true }
				isPrimary={ true }
				type="submit"
				onClick={ e => {
					// e.preventDefault();
				} }
			>
				{ __( 'Save changes' ) }
			</Button>
		</StyledOptions>
	);
}

export default Options;
