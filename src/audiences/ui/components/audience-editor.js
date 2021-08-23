import React, { Component } from 'react';
import styled from 'styled-components';

import {
	defaultAudience,
	defaultGroup,
} from '../data/defaults';

import Group from './group';
import SelectInclude from './select-include';

const { __ } = wp.i18n;
const { Button } = wp.components;

const StyledAudienceEditor = styled.div`
	margin: 0 0 40px;

	.audience-editor__include {
		margin: 20px 0;
	}
`;

/**
 * Audience Editor Component.
 */
export default class AudienceEditor extends Component {
	/**
	 * Change rule inclusion setting/
	 *
	 * @param {Event} e Change event object.
	 */
	onChangeInclude = e => {
		this.props.onChange( {
			...this.props.audience,
			include: e.target.value,
		} );
	}

	/**
	 * Add rule group handler.
	 */
	onAddGroup = () => {
		this.props.onChange( {
			...this.props.audience,
			groups: [
				...this.props.audience.groups,
				defaultGroup,
			],
		} );
	}

	/**
	 * Update group handler.
	 *
	 * @param {number} id Group index.
	 * @param {object} group Group config object.
	 */
	onUpdateGroup = ( id, group = {} ) => {
		const { audience } = this.props;
		this.props.onChange( {
			...audience,
			groups: [
				...audience.groups.slice( 0, id ),
				{
					...audience.groups[ id ],
					...group,
				},
				...audience.groups.slice( id + 1 ),
			],
		} );
	}

	/**
	 * Remove group handler.
	 *
	 * @param {number} id Group index.
	 */
	onRemoveGroup = id => {
		const { audience } = this.props;
		this.props.onChange( {
			...audience,
			groups: [
				...audience.groups.slice( 0, id ),
				...audience.groups.slice( id + 1 ),
			],
		} );
	}

	render() {
		const { audience } = this.props;

		return (
			<StyledAudienceEditor className="audience-editor">
				<div className="audience-editor__include">
					<SelectInclude
						label={ __( 'groups', 'altis-analytics' ) }
						name="audience[include]"
						value={ audience.include }
						onChange={ this.onChangeInclude }
					/>
				</div>

				{ audience.groups.map( ( group, groupId ) => (
					<Group
						key={ groupId }
						canRemove={ audience.groups.length > 1 }
						namePrefix={ `audience[groups][${ groupId }]` }
						title={ `${ __( 'Group' ) } ${ groupId + 1 }` }
						onChange={ value => this.onUpdateGroup( groupId, value ) }
						onRemove={ () => this.onRemoveGroup( groupId ) }
						{ ...group }
					/>
				) ) }

				<Button
					className="audience-editor__group-add"
					isSecondary
					onClick={ this.onAddGroup }
				>
					{ __( 'Add a group', 'altis-analytics' ) }
				</Button>
			</StyledAudienceEditor>
		);
	}
}

AudienceEditor.defaultProps = {
	audience: defaultAudience,
	fields: [],
	/**
	 * Default group update handler.
	 */
	onChange: () => {},
};
