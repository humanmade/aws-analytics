import React from 'react';

import {
	NUMERIC_OPERATIONS,
	STRING_OPERATIONS,
} from '../data/constants';

export default function SelectOperator( props ) {
	const {
		type = 'string',
	} = props;

	let options = STRING_OPERATIONS;

	if ( type === 'number' ) {
		options = NUMERIC_OPERATIONS;
	}

	return (
		<select { ...props }>
			{ Object.entries( options ).map( ( [ value, label ] ) => (
				<option key={ value } value={ value }>{ label }</option>
			) ) }
		</select>
	);
}
