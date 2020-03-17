import React from 'react';
import styled from 'styled-components';

import Rule from './rule';
import SelectInclude from './select-include';

import { defaultRule } from '../data/defaults';

const { __ } = wp.i18n;
const { Button } = wp.components;

const Group = props => {
	const {
		title,
		className,
		onChange,
		namePrefix,
		include,
		rules,
		fields,
		canRemove,
		onRemove,
	} = props;

	const updateRule = ( ruleId, rule ) => {
		const newRules = rules.slice();
		const newRule = Object.assign( {}, rules[ ruleId ], rule );
		newRules.splice( ruleId, 1, newRule );
		onChange( { rules: newRules } );
	};

	return (
		<div className={ `audience-editor__group ${ className }` }>
			<div className="audience-editor__group-header">
				{ title && <h3>{ title }</h3> }
				<SelectInclude
					label={ __( 'rules', 'altis-analytics' ) }
					name={ `${ namePrefix }[include]` }
					value={ include }
					onChange={ e => onChange( { include: e.target.value } ) }
				/>
			</div>

			{ rules.map( ( rule, ruleId ) => (
				<Rule
					key={ ruleId }
					onChange={ value => updateRule( ruleId, value ) }
					fields={ fields }
					namePrefix={ `${ namePrefix }[rules][${ ruleId }]` }
					canRemove={ rules.length > 1 }
					onRemove={ () => {
						const newRules = rules.slice();
						newRules.splice( ruleId, 1 );
						onChange( { rules: newRules } );
					} }
					{ ...rule }
				/>
			) ) }

			<div className="audience-editor__group-footer">
				<Button
					className="audience-editor__group-rule-add"
					isLarge
					onClick={ () => onChange( { rules: rules.concat( [ defaultRule ] ) } ) }
				>
					{ __( 'Add a rule', 'altis-analytics' ) }
				</Button>

				{ canRemove && (
					<Button
						className="audience-editor__group-remove"
						isDestructive
						isLink
						onClick={ onRemove }
					>
						{ __( 'Remove group', 'altis-analytics' ) }
					</Button>
				) }
			</div>
		</div>
	);
};

const StyledGroup = styled( Group )`
	background: rgba(0, 0, 0, 0.02);
	border-radius: 3px;
	border: 1px solid rgba(0, 0, 0, .1);
	padding: 20px;
	margin: 0 0 20px;

	.audience-editor__group-header {
		margin: 0 0 15px;
		display: flex;
		align-items: baseline;
	}

	h3 {
		margin: 0 20px 0 0;
		text-transform: lowercase;
		font-variant: small-caps;
	}

	.audience-editor__group-footer .components-button {
		margin-right: 10px;
	}
`;

export default StyledGroup;
