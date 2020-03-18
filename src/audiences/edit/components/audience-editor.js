import React, { Component } from 'react';
import styled from 'styled-components';

import Group from './group';
import SelectInclude from './select-include';
import {
	defaultAudience,
	defaultGroup,
} from '../data/defaults';

const { __ } = wp.i18n;
const { Button } = wp.components;

const StyledAudienceEditor = styled.div`
	margin: 0 0 40px;

	.audience-editor__include {
		margin: 20px 0;
	}
`;

class AudienceEditor extends Component {

	updateAudience( audience ) {
		const updatedAudience = Object.assign( {}, this.props.audience, audience );
		this.props.onChange( updatedAudience );
	}

	updateGroup( groupId, group = {} ) {
		const groups = this.props.audience.groups.slice();
		const newGroup = Object.assign( {}, groups[ groupId ], group );
		groups.splice( groupId, 1, newGroup );
		this.updateAudience( { groups } );
	}

	render() {
		const { audience } = this.props;

		return (
			<StyledAudienceEditor className="audience-editor">
				<div className="audience-editor__include">
					<SelectInclude
						name="audience[include]"
						label={ __( 'groups', 'altis-analytics' ) }
						value={ audience.include }
						onChange={ e => this.updateAudience( { include: e.target.value } ) }
					/>
				</div>

				{ audience.groups.map( ( group, groupId ) => (
					<Group
						title={ `${ __( 'Group' ) } ${ groupId + 1 }` }
						key={ groupId }
						onChange={ value => this.updateGroup( groupId, value ) }
						namePrefix={ `audience[groups][${ groupId }]` }
						canRemove={ audience.groups.length > 1 }
						onRemove={ () => {
							const newGroups = audience.groups.slice();
							newGroups.splice( groupId, 1 );
							this.updateAudience( { groups: newGroups } );
						} }
						{ ...group }
					/>
				) ) }

				<Button
					className="audience-editor__group-add"
					isLarge
					isPrimary
					onClick={ () => this.updateAudience( { groups: audience.groups.concat( [ defaultGroup ] ) } ) }
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
	onChange: () => {},
};

export default AudienceEditor;
