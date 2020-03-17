import React, { useState, useEffect, Fragment } from 'react';
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
import {
	getFields,
} from './data';

const { __ } = wp.i18n;
const { Button } = wp.components;

// Check for standard post edit page options meta box.
const AudienceOptionsUI = document.getElementById( 'altis-analytics-audience-options' );

const Edit = props => {
	// Set the audience from props or use default.
	const [ audience, setAudience ] = useState( props.audience || defaultAudience );
	// Set the dropdown fields from props or fetch.
	const [ fields, setFields ] = useState( props.fields || [] );
	// Show errors.
	const [ error, setError ] = useState( null );

	// Fetch fields data.
	useEffect( () => {
		if ( fields.length ) {
			return;
		}
		( async () => {
			const fieldsResponse = await getFields();
			if ( fieldsResponse instanceof Array && ! fieldsResponse.error ) {
				if ( error ) {
					setError( null );
				}
				setFields( fieldsResponse );
			} else {
				setError( fieldsResponse.error );
			}
		} )();
	}, [ fields, error ] );

	// Audience update helpers.
	const updateAudience = newAudience => {
		setAudience( audienceToUpdate => {
			return {
				...audienceToUpdate,
				...newAudience,
			};
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
			{ error && (
				<div className="error msg">
					<p>{ error.message }</p>
				</div>
			) }

			{ /* A portal is used here to support the legacy post edit screen publish meta boxes and to
				pass the actively edited audience through to the Options */ }
			{ AudienceOptionsUI && ReactDOM.createPortal(
				<Options
					audience={ audience }
					postId={ props.postId }
				/>,
				AudienceOptionsUI
			) }

			<div className="audience-editor__include">
				<SelectInclude
					name="audience[include]"
					label={ __( 'groups', 'altis-analytics' ) }
					value={ audience.include }
					onChange={ e => updateAudience( { include: e.target.value } ) }
				/>
			</div>

			{ audience.groups.map( ( group, groupId ) => (
				<Group key={ groupId }>
					<div className="audience-editor__group-header">
						<h3>{ __( 'Group', 'altis-analytics' ) } { groupId + 1 }</h3>
						<SelectInclude
							label={ __( 'rules', 'altis-analytics' ) }
							name={ `audience[groups][${ groupId }][include]` }
							value={ group.include }
							onChange={ e => updateGroup( groupId, { include: e.target.value } ) }
						/>
					</div>
					{ group.rules.map( ( rule, ruleId ) => {
						const currentField = fields.filter( fieldData => fieldData.name === rule.field )[0] ?? {};

						return (
							<Rule key={ ruleId }>
								<select
									className="audience-editor__rule-field"
									name={ `audience[groups][${groupId}][rules][${ruleId}][field]` }
									value={ rule.field }
									onChange={ e => updateRule( groupId, ruleId, { field: e.target.value } ) }
								>
									<option value="" className="placeholder">{ __( 'Select a field', 'altis-analytics' ) }</option>
									{ fields.map( field => (
										<option key={ field.name } value={ field.name }>{ field.label }</option>
									) ) }
								</select>
								<select
									className="audience-editor__rule-operator"
									name={ `audience[groups][${groupId}][rules][${ruleId}][operator]` }
									value={ rule.operator }
									onChange={ e => updateRule( groupId, ruleId, { operator: e.target.value } ) }
								>
									{ ( ! currentField.type || currentField.type === 'string' ) && (
										<Fragment>
											<option value="=">{ __( 'is', 'altis-analytics' ) }</option>
											<option value="!=">{ __( 'is not', 'altis-analytics' ) }</option>
											<option value="*=">{ __( 'contains', 'altis-analytics' ) }</option>
											<option value="!*">{ __( 'does not contain', 'altis-analytics' ) }</option>
											<option value="^=">{ __( 'begins with', 'altis-analytics' ) }</option>
										</Fragment>
									) }
									{ currentField.type === 'number' && (
										<Fragment>
											<option value="gt">{ __( 'is greater than', 'altis-analytics' ) }</option>
											<option value="lt">{ __( 'is less than', 'altis-analytics' ) }</option>
											<option value="gte">{ __( 'is greater than or equal to', 'altis-analytics' ) }</option>
											<option value="lte">{ __( 'is less than or equal to', 'altis-analytics' ) }</option>
										</Fragment>
									) }
								</select>
								{ ( ! currentField.type || currentField.type === 'string' ) && (
									<Fragment>
										{ [ '=', '!=' ].indexOf( rule.operator ) >= 0 && (
											<select
												className="audience-editor__rule-value"
												name={ `audience[groups][${groupId}][rules][${ruleId}][value]` }
												value={ rule.value }
												onChange={ e => updateRule( groupId, ruleId, { value: e.target.value } ) }
											>
												<option value="">{ __( 'Empty', 'altis-analytics' ) }</option>
												{ fields.filter( field => field.name === rule.field ).map( field => field.data && field.data.map( ( datum, index ) => (
													<option key={ index } value={ datum.value }>{ datum.value }</option>
												) ) ) }
											</select>
										) }
										{ [ '*=', '!*', '^=' ].indexOf( rule.operator ) >= 0 && (
											<input
												className="regular-text"
												name={ `audience[groups][${groupId}][rules][${ruleId}][value]` }
												type="text"
												value={ rule.value }
												onChange={ e => updateRule( groupId, ruleId, { value: e.target.value } ) }
											/>
										) }
									</Fragment>
								) }
								{ currentField.type === 'number' && (
									<input
										className="regular-text"
										name={ `audience[groups][${groupId}][rules][${ruleId}][value]` }
										placeholder={ `${ __( 'Average value: ', 'altis-analytics' ) } ${ currentField.stats.avg }` }
										type="number"
										value={ rule.value }
										onChange={ e => updateRule( groupId, ruleId, { value: e.target.value } ) }
									/>
								) }

								{ group.rules.length > 1 && (
									<Button
										className="audience-editor__rule-remove"
										isDestructive
										isLink
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
						isLarge
						onClick={ () => updateGroup( groupId, { rules: group.rules.concat( [ defaultRule ] ) } ) }
					>
						{ __( 'Add a rule', 'altis-analytics' ) }
					</Button>

					{ audience.groups.length > 1 && (
						<Button
							className="audience-editor__group-remove"
							isDestructive
							isLink
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
			) ) }

			<Button
				className="audience-editor__group-add"
				isLarge
				isPrimary
				onClick={ () => updateAudience( { groups: audience.groups.concat( [ defaultGroup ] ) } ) }
			>
				{ __( 'Add a group', 'altis-analytics' ) }
			</Button>
		</Editor>
	);
};

export default Edit;
