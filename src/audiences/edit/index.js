import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Editor from './components/editor';
import Group from './components/group';
import Options from './components/options';
import Rule from './components/rule';
import SelectInclude from './components/select-include';
import {
	defaultAudience,
	defaultGroup,
	defaultRule,
} from './data/defaults';

const { __ } = wp.i18n;
const { Button } = wp.components;

const AudienceOptionsUI = document.getElementById( 'altis-analytics-audience-options' );

const Edit = () => {
	// Collect the audience state.
	const [ audience, setAudience ] = useState( defaultAudience );

	const updateAudience = ( newAudience ) => {
		setAudience( audienceToUpdate => {
			return { ...audienceToUpdate, ...newAudience };
		} );
	};

	const updateGroup = ( groupId, group ) => {
		const groups = audience.groups.slice();
		const newGroup = Object.assign( {}, groups[ groupId ], group );
		groups.splice( groupId, 1, newGroup );
		updateAudience( { groups } );
	};

	const updateRule = ( groupId, ruleId, rule ) => {
		const rules = audience.groups[ groupId ].rules.slice();
		const newRule = Object.assign( {}, rules[ ruleId ], rule );
		rules.splice( ruleId, 1, newRule );
		updateGroup( groupId, { rules } );
	};

	return (
		<Editor>
			{ AudienceOptionsUI && ReactDOM.createPortal( <Options audience={ audience } />, AudienceOptionsUI ) }

			<div className="audience-editor__include">
				<SelectInclude
					onChange={ e => updateAudience( { include: e.target.value } ) }
					value={ audience.include }
					name="audience_include"
					label={ __( 'groups', 'altis-analytics' ) }
				/>
			</div>

			{ audience.groups.map( ( group, groupId ) => {
				return (
					<Group>
						<div className="audience-editor__group-header">
							<h3>{ __( 'Group', 'altis-analytics' ) } { groupId + 1 }</h3>
							<SelectInclude
								onChange={ e => updateGroup( groupId, { include: e.target.value } ) }
								value={ group.include }
								name={ `audience_group[${ groupId }][include]` }
								label={ __( 'rules', 'altis-analytics' ) }
							/>
						</div>
						{ group.rules.map( ( rule, ruleId ) => {
							return (
								<Rule>
									<select
										className="audience-editor__rule-field"
										onChange={ e => updateRule( groupId, ruleId, { field: e.target.value } ) }
										value={ rule.field }
										name={`audience_group[${groupId}][rules][${ruleId}][field]`}
									>
										{ Altis.Analytics.Audiences.DataMaps.map( map => (
											<option value={ map.field }>{ map.label }</option>
										) ) }
									</select>
									<select
										className="audience-editor__rule-operator"
										onChange={ e => updateRule( groupId, ruleId, { operator: e.target.value } ) }
										value={ rule.operator }
										name={`audience_group[${groupId}][rules][${ruleId}][operator]`}
									>
										<option value="=">is</option>
										<option value="!=">is not</option>
										<option value="*">contains</option>
										<option value="!*">does not contain</option>
									</select>
									<select
										className="audience-editor__rule-value"
										onChange={ e => updateRule( groupId, ruleId, { value: e.target.value } ) }
										value={ rule.value }
										name={`audience_group[${groupId}][rules][${ruleId}][value]`}
									>
										<option value="">{ __( 'Empty', 'altis-analytics' ) }</option>
										{ ( Altis.Analytics.Audiences.Data[ rule.field ] || { buckets: [] } ).buckets.map( bucket => bucket.key && (
											<option value={ bucket.key }>{ bucket.key }</option>
										) ) }
									</select>

									{ group.rules.length > 1 && (
										<Button
											className="audience-editor__rule-remove"
											isDestructive={ true }
											isLink={ true }
											onClick={ () => {
												const newRules = group.rules.slice();
												newRules.splice( ruleId, 1 );
												updateGroup( groupId, { rules: newRules } );
											} }
										>
											<span className="screen-reader-text">{ __( 'Remove rule', 'altis-analytics' ) }</span>
											&times;
										</Button>
									) }
								</Rule>
							);
						} ) }

						<Button
							className="audience-editor__rule-add"
							isLarge={ true }
							onClick={ () => updateGroup( groupId, { rules: group.rules.concat( [ defaultRule ] ) } ) }
						>
							{ __( 'Add a rule', 'altis-analytics' ) }
						</Button>

						{ audience.groups.length > 1 && (
							<Button
								className="audience-editor__group-remove"
								isDestructive={ true }
								isLink={ true }
								onClick={ () => {
									const newGroups = audience.groups.slice();
									newGroups.splice( groupId, 1 );
									updateAudience( { groups: newGroups } );
								} }
							>
								{ __( 'Remove group', 'altis-analytics' ) }
							</Button>
						) }
					</Group>
				);
			} ) }
			<Button
				className="audience-editor__group-add"
				isLarge={ true }
				isPrimary={ true }
				onClick={ () => updateAudience( { groups: audience.groups.concat( [ defaultGroup ] ) } ) }
			>
				{ __( 'Add a group', 'altis-analytics' ) }
			</Button>
		</Editor>
	);
}

export default Edit;
