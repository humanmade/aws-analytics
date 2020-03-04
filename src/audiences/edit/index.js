import React, { useState } from 'react';
import SelectInclude from './select-include';

const { __ } = wp.i18n;
const { Button } = wp.components;

const defaultRule = {
	field: Altis.Analytics.Audiences.DataMaps[ 0 ].field,
	operator: '=', // =, !=, *, !*
	value: '', // mixed
	type: 'string', // data type, string or number
};

const defaultGroup = {
	include: 'any', // ANY, ALL, NONE
	rules: [
		defaultRule
	],
};

const Edit = () => {

	// Collect the audience state.
	const [ audience, setAudience ] = useState( {
		include: 'any', // ANY, ALL, NONE
		groups: [
			defaultGroup,
		],
	} );

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
		<div className="altis-analytics-audience-editor">
			<p>
				{ __( 'Include visitors who match', 'altis-analytics' ) }
				{ ' ' }
				<SelectInclude
					onChange={ e => updateAudience( { include: e.target.value } ) }
					value={ audience.include }
					name="audience_include"
				/>
				{ ' ' }
				{ __( 'of the following', 'altis-analytics' ) }:
			</p>

			{ audience.groups.map( ( group, groupId ) => {
				return (
					<div className="altis-analytics-audience-editor__group">
						{ group.rules.length > 1 && (
							<p>
								<SelectInclude
									onChange={ e => updateGroup( groupId, { include: e.target.value } ) }
									value={ group.include }
									name={`audience_group[${groupId}][include]`}
								/>
							</p>
						) }
						{ group.rules.map( ( rule, ruleId ) => {
							return (
								<div className="altis-analytics-audience-editor__group-rule">
									<select
										onChange={ e => updateRule( groupId, ruleId, { field: e.target.value } ) }
										value={ rule.field }
										name={`audience_group[${groupId}][rules][${ruleId}][field]`}
									>
										{ Altis.Analytics.Audiences.DataMaps.map( map => (
											<option value={ map.field }>{ map.label }</option>
										) ) }
									</select>
									<select
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
											onClick={ () => {
												const newRules = group.rules.slice();
												newRules.splice( ruleId, 1 );
												updateGroup( groupId, { rules: newRules } );
											} }
										>
											{ __( 'Remove rule', 'altis-analytics' ) }
										</Button>
									) }
								</div>
							);
						} ) }
						<Button
							isLarge={ true }
							onClick={ () => updateGroup( groupId, { rules: group.rules.concat( [ defaultRule ] ) } ) }
						>
							{ __( 'Add a rule', 'altis-analytics' ) }
						</Button>

						{ audience.groups.length > 1 && (
							<Button
								isLarge={ true }
								onClick={ () => {
									const newGroups = audience.groups.slice();
									newGroups.splice( groupId, 1 );
									updateAudience( { groups: newGroups } );
								} }
							>
								{ __( 'Remove group', 'altis-analytics' ) }
							</Button>
						) }
					</div>
				);
			} ) }
			<Button
				isLarge={ true }
				isPrimary={ true }
				onClick={ () => updateAudience( { groups: audience.groups.concat( [ defaultGroup ] ) } ) }
			>
				{ __( 'Add a group', 'altis-analytics' ) }
			</Button>
		</div>
	);
}

export default Edit;
