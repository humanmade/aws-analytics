import React, { Fragment } from 'react';
import styled from 'styled-components';

import SelectOperator from './select-operator';

const { Button } = wp.components;
const { useSelect } = wp.data;
const { __ } = wp.i18n;

const StyledRule = styled.div`
	margin: 0 0 15px;
	display: flex;

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
`;

const Rule = props => {
	const {
		namePrefix,
		field,
		operator,
		onChange,
		value,
		canRemove,
		onRemove,
	} = props;

	const fields = useSelect( select => select( 'audience' ).getFields(), [] );
	const currentField = fields.filter( fieldData => fieldData.name === field )[0] || {};

	return (
		<StyledRule className="audience-editor__rule">
			<select
				className="audience-editor__rule-field"
				name={ `${namePrefix}[field]` }
				value={ field }
				onChange={ e => onChange( { field: e.target.value } ) }
				disabled={ fields.length === 0 }
			>
				<option value="" className="placeholder">{ __( 'Select a field', 'altis-analytics' ) }</option>
				{ fields.map( fieldData => (
					<option key={ fieldData.name } value={ fieldData.name }>{ fieldData.label }</option>
				) ) }
			</select>

			<SelectOperator
				className="audience-editor__rule-operator"
				name={ `${ namePrefix }[operator]` }
				value={ operator }
				onChange={ e => onChange( { operator: e.target.value } ) }
				fieldType={ currentField.type || 'string' }
				disabled={ fields.length === 0 }
			/>

			{ ( ! currentField.type || currentField.type === 'string' ) && (
				<Fragment>
					{ [ '=', '!=' ].indexOf( operator ) >= 0 && (
						<select
							className="audience-editor__rule-value"
							name={ `${ namePrefix }[value]` }
							value={ value }
							onChange={ e => onChange( { value: e.target.value } ) }
							disabled={ fields.length === 0 }
						>
							<option value="">{ __( 'Empty', 'altis-analytics' ) }</option>
							{ fields.filter( fieldData => fieldData.name === field ).map( fieldData => fieldData.data && fieldData.data.map( datum => (
								<option key={ datum.value } value={ datum.value }>{ datum.value }</option>
							) ) ) }
						</select>
					) }
					{ [ '*=', '!*', '^=' ].indexOf( operator ) >= 0 && (
						<input
							className="regular-text"
							name={ `${ namePrefix }[value]` }
							type="text"
							value={ value }
							onChange={ e => onChange( { value: e.target.value } ) }
							disabled={ fields.length === 0 }
						/>
					) }
				</Fragment>
			) }

			{ currentField.type === 'number' && (
				<input
					className="regular-text"
					name={ `${ namePrefix }[value]` }
					placeholder={ `${ __( 'Average value: ', 'altis-analytics' ) } ${ currentField.stats.avg || __( 'unknown', 'altis-analytics' ) }` }
					type="number"
					value={ value }
					onChange={ e => onChange( { value: e.target.value } ) }
					disabled={ fields.length === 0 }
				/>
			) }

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
		</StyledRule>
	);
};

export default Rule;
