import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { defaultAudience } from '../data/defaults';
import { getEstimate } from '../data';

const { Button } = wp.components;
const { __ } = wp.i18n;

const StyledOptions = styled.div.attrs( () => ( {
	className: "audience-options"
} ) )`

`;

const Options = props => {
	const {
		audience,
	} = props;

	const [ estimate, setEstimate ] = useState( { count: 0, histogram: [] } );
	const fetchEstimate = () => {
		( async () => {
			const estimateResponse = await getEstimate( audience );
			setEstimate( estimateResponse );
		} )();
	}

	// Get initial estimate.
	useEffect( fetchEstimate, [ audience ] );

	return (
		<StyledOptions>
			<div className="audience-estimate">
				<h4>{ __( 'Audience Estimate', 'altis-analytics' ) }</h4>
				<p><strong>{ estimate.count }</strong> { __( 'last week' ) }</p>
				<Button
					isLink={ true }
					onClick={ fetchEstimate }
				>
					{ __( 'Refresh', 'altis-analytics' ) }
				</Button>
			</div>

			<Button
				isLarge={ true }
				isPrimary={ true }
				type="submit"
				onClick={ e => {
					e.preventDefault();
				} }
			>
				{ __( 'Save changes' ) }
			</Button>
		</StyledOptions>
	);
}

Options.defaultProps = {
	audience: defaultAudience,
};

export default Options;
