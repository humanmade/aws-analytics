import React, { Fragment } from 'react';
import styled from 'styled-components';

import SelectOperator from './select-operator';

const { Button } = wp.components;
const { useSelect } = wp.data;
const { sprintf, __ } = wp.i18n;

const StyledRule = styled.div`
	margin: 0 0 15px;
	display: flex;
	flex-wrap: wrap;

	select, input {
		flex: 1;
	}

	&& > * + * {
		margin-left: 5px;
	}

	.audience-editor__rule-operator,
	button {
		flex 0;
	}

	p.description {
		width: 100%;
		margin: 8px 0 0;
	}
`;

const RuleInput = props => {
	const {
		disabled,
		currentField,
		name,
		operator,
		value,
		onChange,
	} = props;

	switch ( currentField.type ) {
		case 'number':
			return (
				<input
					className="regular-text"
					disabled={ disabled }
					name={ name }
					placeholder={ `${ sprintf(
						__( 'Avg: %d, Lowest: %d, Highest: %d', 'altis-analytics' ),
						Number( currentField.stats.avg ).toFixed( 2 ),
						Number( currentField.stats.min ).toFixed( 2 ),
						Number( currentField.stats.max ).toFixed( 2 )
					) }` }
					type="number"
					value={ value }
					onChange={ onChange }
				/>
			);

		case 'string':
		default:
			switch ( operator ) {
				case '=':
				case '!=':
				case '*=':
				case '!*':
				case '^=':
					return (
						<Fragment>
							<input
								className="regular-text"
								disabled={ disabled }
								name={ name }
								type="text"
								value={ value }
								onChange={ onChange }
								list={ `audience-editor__rule__data_${ name }` }
								autoComplete="on"
							/>
							<datalist
								id={ `audience-editor__rule__data_${ name }` }
								className="audience-editor__rule-value"
								disabled={ disabled }
								name={ name }
								value={ value }
								onChange={ onChange }
							>
								<option value="">{ __( 'Empty', 'altis-analytics' ) }</option>
								{ currentField.data && currentField.data.map( datum => datum.value !== '' && (
									<option
										key={ datum.value }
										value={ datum.value }
									/>
								) ) }
							</datalist>
						</Fragment>
					);

				default:
					return null;
			}
	}
};

export default function Rule( props ) {
	const {
		canRemove,
		field,
		namePrefix,
		operator,
		value,
		onChange,
		onRemove,
	} = props;

	const fields = useSelect( select => select( 'audience' ).getFields(), [] );
	const currentField = fields.find( fieldData => fieldData.name === field ) || {};

	return (
		<StyledRule className="audience-editor__rule">
			<select
				className="audience-editor__rule-field"
				name={ `${namePrefix}[field]` }
				value={ field }
				onChange={ e => onChange( {
					field: e.target.value,
					value: '',
				} ) }
				disabled={ fields.length === 0 }
			>
				<option
					className="placeholder"
					value=""
				>
					{ __( 'Select a field', 'altis-analytics' ) }
				</option>

				{ fields.map( fieldData => (
					<option
						key={ fieldData.name }
						value={ fieldData.name }
					>
						{ fieldData.label }
					</option>
				) ) }
			</select>

			<SelectOperator
				className="audience-editor__rule-operator"
				name={ `${ namePrefix }[operator]` }
				value={ operator }
				onChange={ e => onChange( { operator: e.target.value } ) }
				type={ currentField.type || 'string' }
				disabled={ fields.length === 0 }
			/>

			<RuleInput
				disabled={ fields.length === 0 }
				currentField={ currentField }
				name={ `${ namePrefix }[value]` }
				operator={ operator }
				value={ value }
				onChange={ e => onChange( { value: e.target.value } ) }
			/>

			{ canRemove && (
				<Button
					className="audience-editor__rule-remove"
					isDestructive
					isLink
					onClick={ onRemove }
				>
					{ __( 'Remove', 'altis-analytics' ) }
				</Button>
			) }

			{ currentField.description && (
				<p className="description">
					{ currentField.description }
				</p>
			) }
		</StyledRule>
	);
}
