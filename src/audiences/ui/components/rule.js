import React, { Fragment, useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

import SelectOperator from './select-operator';

const { Button } = wp.components;
const { useSelect } = wp.data;
const { sprintf, __ } = wp.i18n;

const StyledRule = styled.div`
	margin: 0 0 15px;
	display: flex;
	flex-wrap: wrap;
	align-items: center;

	select, input {
		flex: 1;
	}

	&& > * + * {
		margin-left: 5px;
	}

	.audience-editor__rule-operator,
	button {
		flex: none;
	}

	p.description {
		width: 100%;
		margin: 8px 0 0;
	}
`;

const ClearableInput = styled.div`
	flex: 1;
	input {
		width: 100%;
	}
	.components-button {
		text-decoration: none;
		margin-left: -1.5em;

		&:hover {
			color: #d94f4f;
		}
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

	// Get the currently available values for the field.
	const data = ( currentField.data && currentField.data.map( datum => datum.value ) ) || [];

	// Get input refs to manage focus.
	const inputEl = useRef( null );
	const dropdownRef = useRef( null );

	// Default to display of the dropdown if the value is in existing data or empty.
	const [ showDropdown, setShowDropdown ] = useState( value === '' || data.indexOf( value ) >= 0 );
	useEffect( () => {
		if ( showDropdown ) {
			dropdownRef && dropdownRef.current && dropdownRef.current.focus();
		} else {
			inputEl && inputEl.current && inputEl.current.focus();
		}
	}, [ showDropdown ] );
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
							{ ! showDropdown && (
								<ClearableInput>
									<input
										ref={ inputEl }
										className="regular-text"
										disabled={ disabled }
										list={ `audience-editor__rule__data_${ name }` }
										name={ name }
										type="text"
										value={ value }
										onChange={ onChange }
									/>
									<Button
										isLink
										isDestructive
										label={ __( 'Clear selection', 'altis-anlaytics' ) }
										onClick={ () => {
											onChange( { target: { value: '' } } );
											setShowDropdown( true );
										} }
									>
										&times;
									</Button>
								</ClearableInput>
							) }
							{ showDropdown && (
								<select
									ref={ dropdownRef }
									className="audience-editor__rule-value"
									disabled={ disabled }
									id={ `audience-editor__rule__data_${ name }` }
									name={ name }
									value={ value }
									onChange={ e => {
										if ( e.target.value === '___' ) {
											setShowDropdown( false );
										} else {
											onChange( e );
										}
									} }
								>
									<option value="">{ __( 'Empty', 'altis-analytics' ) }</option>
									{ data.map( datum => datum !== '' && (
										<option
											key={ datum }
											value={ datum }
										>
											{ datum }
										</option>
									) ) }
									<option value="___">{ __( 'Other, please specify...', 'altis-analytics' ) }</option>
								</select>
							) }
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
				disabled={ fields.length === 0 }
				name={ `${namePrefix}[field]` }
				value={ field }
				onChange={ e => onChange( {
					field: e.target.value,
					value: '',
				} ) }
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
				disabled={ fields.length === 0 }
				name={ `${ namePrefix }[operator]` }
				type={ currentField.type || 'string' }
				value={ operator }
				onChange={ e => onChange( { operator: e.target.value } ) }
			/>

			<RuleInput
				currentField={ currentField }
				disabled={ fields.length === 0 }
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
