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

/**
 * Rule input component.
 *
 * @param {object} props Component props.
 * @returns {React.ReactNode} Rule input component.
 */
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
	const options = ( currentField.data && currentField.data.map( option => ( {
		value: option.value,
		label: ( option.label ? `${ option.label } (${ option.value })` : option.value ) + String( option.percent ? ` ~${ option.percent }%` : '' ),
		count: Number( option?.count ) || 0,
		percent: Number( option?.percent ) || 0,
	} ) ) ) || [];
	// Sort options by their size/hits.
	const topHits = options.filter( option => option.percent ).slice( 0, 10 );
	topHits.sort( ( a, b ) => b.percent - a.percent );
	// Check if the filter doesn't allow free text.
	const allowFreeText = ! currentField?.options?.disable_free_text;

	// Get input refs to manage focus.
	const inputEl = useRef( null );
	const dropdownRef = useRef( null );

	// Default to display of the dropdown if the value is in existing data or empty.
	const defaultDropdownState = value === '' || !! options.find( option => option.value === value );
	const [ showDropdown, setShowDropdown ] = useState( defaultDropdownState );
	useEffect( () => {
		if ( showDropdown ) {
			dropdownRef && dropdownRef.current && dropdownRef.current.focus();
		} else {
			inputEl && inputEl.current && inputEl.current.focus();
		}
	}, [ showDropdown ] );

	// Set intial dropdown state and update if the field has changed.
	const [ prevField, setPrevField ] = useState( null );
	if ( currentField.name !== prevField ) {
		setShowDropdown( defaultDropdownState );
		setPrevField( currentField.name );
	}

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
										onBlur={ () => {
											// If the value is empty or in the field data convert back to dropdown on blur.
											setShowDropdown( defaultDropdownState );
										} }
										onChange={ onChange }
									/>
									<Button
										isDestructive
										isLink
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
									{ topHits.length > 0 && (
										<optgroup label={ __( 'Top hits', 'altis-analytics' ) }>
											{ topHits.map( option => option.value !== '' && (
												<option
													key={ option.value }
													value={ option.value }
												>
													{ option.label }
												</option>
											) ) }
										</optgroup>
									) }
									{ options.map( option => option.value !== '' && (
										<option
											key={ option.value }
											value={ option.value }
										>
											{ option.label }
										</option>
									) ) }
									{ allowFreeText && (
										<option value="___">{ __( 'Other, please specify...', 'altis-analytics' ) }</option>
									) }
								</select>
							) }
						</Fragment>
					);

				default:
					return null;
			}
	}
};

/**
 * The rule editor input component.
 *
 * @param {object} props Component props.
 * @returns {React.ReactNode} Rule Editor component.
 */
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

	const persistentFields = fields.filter( fieldData => fieldData.name.match( /^endpoint\./ ) );
	const pointInTimeFields = fields.filter( fieldData => ! fieldData.name.match( /^endpoint\./ ) );

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
				<optgroup label={ __( 'Persistent Data', 'altis-analytics' ) }>
					{ persistentFields.map( fieldData => (
						<option
							key={ fieldData.name }
							value={ fieldData.name }
						>
							{ fieldData.label }
						</option>
					) ) }
				</optgroup>
				<optgroup label={ __( 'Point-in-time Data', 'altis-analytics' ) }>
					{ pointInTimeFields.map( fieldData => (
						<option
							key={ fieldData.name }
							value={ fieldData.name }
						>
							{ fieldData.label }
						</option>
					) ) }
				</optgroup>
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
