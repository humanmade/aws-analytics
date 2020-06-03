import React from 'react';

const { __ } = wp.i18n;

const ListRowHeading = props => (
	<tr>
		<th scope="col" className="manage-column column-order">
			{ __( 'Priority', 'altis-analytics' ) }
		</th>
		<th scope="col" className="manage-column column-title column-primary">
			{ __( 'Title', 'altis-analytics' ) }
		</th>
		<th scope="col" className="manage-column column-active">
			{ __( 'Status', 'altis-analytics' ) }
		</th>
		<th scope="col" className="manage-column column-estimate">
			{ __( 'Size', 'altis-analytics' ) }
		</th>
		{ props.isSelectMode && (
			<th scope="col" className="manage-column column-select">&nbsp;</th>
		) }
	</tr>
);

export default ListRowHeading;
