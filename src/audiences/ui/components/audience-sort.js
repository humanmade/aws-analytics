import React from 'react';
import styled from 'styled-components';

const { IconButton } = wp.components;
const { __ } = wp.i18n;

const StyledAudienceSort = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;

	.audience-sort-order {
		&__number {
			font-weight: bold;
			flex: 1;
		}
		&__controls {
			flex: 1;
			button {
				padding: 3px;
			}
		}
		&__up {
			margin-bottom: 2px;
		}
	}
`;

const AudienceSort = props => {
	const {
		canMoveDown,
		canMoveUp,
		index,
		onMoveDown,
		onMoveUp,
	} = props;

	return (
		<StyledAudienceSort className="audience-sort-order">
			<span className="audience-sort-order__number">{ index + 1 }</span>
			<span className="audience-sort-order__controls">
				<IconButton
					className="audience-sort-order__up"
					disabled={ ! canMoveUp }
					icon="arrow-up-alt2"
					label={ __( 'Move up', 'altis-analytics' ) }
					onClick={ onMoveUp }
				/>
				<IconButton
					className="audience-sort-order__down"
					disabled={ ! canMoveDown }
					icon="arrow-down-alt2"
					label={ __( 'Move down', 'altis-analytics' ) }
					onClick={ onMoveDown }
				/>
			</span>
		</StyledAudienceSort>
	);
};

export default AudienceSort;
