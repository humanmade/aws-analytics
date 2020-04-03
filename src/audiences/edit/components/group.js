import React from 'react';
import styled from 'styled-components';

import Rule from './rule';
import SelectInclude from './select-include';

import { defaultRule } from '../data/defaults';

const { __ } = wp.i18n;
const { Button } = wp.components;

const StyledGroup = styled.div`
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

const Group = props => {
	const {
		title,
		onChange,
		namePrefix,
		include,
		rules,
		fields,
		canRemove,
		onRemove,
	} = props;

	const onAddRule = () => {
		onChange( {
			rules: [
				...rules,
				defaultRule,
			],
		} );
	};

	const onChangeRule = e => {
		onChange( {
			include: e.target.value,
		} );
	};

	const onRemoveRule = id => {
		onChange( {
			rules: [
				...rules.slice( 0, id ),
				...rules.slice( id + 1 ),
			],
		} );
	};

	const updateRule = ( ruleId, rule ) => {
		onChange( {
			rules: [
				...rules.slice( 0, ruleId ),
				{
					...rules[ ruleId ],
					...rule,
				},
				...rules.slice( ruleId + 1 ),
			],
		} );
	};

	return (
		<StyledGroup className="audience-editor__group">
			<div className="audience-editor__group-header">
				{ title && <h3>{ title }</h3> }
				<SelectInclude
					label={ __( 'rules', 'altis-analytics' ) }
					name={ `${ namePrefix }[include]` }
					value={ include }
					onChange={ onChangeRule }
				/>
			</div>

			{ rules.map( ( rule, ruleId ) => (
				<Rule
					key={ ruleId }
					onChange={ value => updateRule( ruleId, value ) }
					fields={ fields }
					namePrefix={ `${ namePrefix }[rules][${ ruleId }]` }
					canRemove={ rules.length > 1 }
					onRemove={ () => onRemoveRule( ruleId ) }
					{ ...rule }
				/>
			) ) }

			<div className="audience-editor__group-footer">
				<Button
					className="audience-editor__group-rule-add"
					isLarge
					onClick={ onAddRule }
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
		</StyledGroup>
	);
};

export default Group;
