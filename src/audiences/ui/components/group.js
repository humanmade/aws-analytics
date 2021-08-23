import React, { Component } from 'react';
import styled from 'styled-components';

import { defaultRule } from '../data/defaults';

import Rule from './rule';
import SelectInclude from './select-include';

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

/**
 * Rule Group editor component.
 */
export default class Group extends Component {
	/**
	 * New rule handler.
	 */
	onAddRule = () => {
		this.props.onChange( {
			rules: [
				...this.props.rules,
				defaultRule,
			],
		} );
	};

	/**
	 * Rule update handler.
	 *
	 * @param {Event} e Change event for rule input.
	 */
	onChangeRule = e => {
		this.props.onChange( {
			include: e.target.value,
		} );
	};

	/**
	 * Remove rule handler.
	 *
	 * @param {number} id Rule index to remove.
	 */
	onRemoveRule = id => {
		const { rules } = this.props;
		this.props.onChange( {
			rules: [
				...rules.slice( 0, id ),
				...rules.slice( id + 1 ),
			],
		} );
	};

	/**
	 * Update rule handler.
	 *
	 * @param {number} ruleId Rule index.
	 * @param {object} rule Rule config object.
	 */
	updateRule = ( ruleId, rule ) => {
		const { rules } = this.props;
		this.props.onChange( {
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

	render() {
		const {
			canRemove,
			include,
			fields,
			namePrefix,
			rules,
			title,
			onRemove,
		} = this.props;

		return (
			<StyledGroup className="audience-editor__group">
				<div className="audience-editor__group-header">
					{ title && (
						<h3>{ title }</h3>
					) }
					<SelectInclude
						label={ __( 'rules', 'altis-analytics' ) }
						name={ `${ namePrefix }[include]` }
						value={ include }
						onChange={ this.onChangeRule }
					/>
				</div>

				{ rules.map( ( rule, ruleId ) => (
					<Rule
						key={ ruleId }
						canRemove={ rules.length > 1 }
						fields={ fields }
						namePrefix={ `${ namePrefix }[rules][${ ruleId }]` }
						onChange={ value => this.updateRule( ruleId, value ) }
						onRemove={ () => this.onRemoveRule( ruleId ) }
						{ ...rule }
					/>
				) ) }

				<div className="audience-editor__group-footer">
					<Button
						className="audience-editor__group-rule-add"
						isSecondary
						onClick={ this.onAddRule }
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
	}
}
