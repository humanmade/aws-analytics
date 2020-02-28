import React, { useState } from 'react';

const Edit = () => {
	const [ match, setMatch ] = useState( 'any' );
	const [ operator, setOperator ] = useState( '=' );
	const [ field, setField ] = useState( Altis.Analytics.Audiences.DataMaps[0].field );
	const [ value, setValue ] = useState( '' );

	const valueField = Altis.Analytics.Audiences.Data[ field ] || { buckets: [] };

	return (
		<div className="altis-analytics-audience-editor">
			<p>
				Include visitors who match
				<select
					onChange={ e => setMatch( e.target.value ) }
					value={ match }
				>
					<option value="any">any</option>
					<option value="all">all</option>
				</select>
				of the following:
			</p>

			<div className="altis-analytics-audience-editor__group">
				<select
					onChange={ e => setField( e.target.value ) }
					value={ field }
				>
					{ Altis.Analytics.Audiences.DataMaps.map( map => (
						<option value={ map.field }>{ map.label }</option>
					) ) }
				</select>
				<select
					onChange={ e => setOperator( e.target.value ) }
					value={ operator }
				>
					<option value="=">is</option>
					<option value="!=">is not</option>
					<option value="*">contains</option>
					<option value="!*">does not contain</option>
				</select>
				<select
					onChange={ e => setValue( e.target.value ) }
					value={ value }
				>
					<option value="">Please select a value...</option>
					{ valueField.buckets.map( bucket => (
						<option value={ bucket.key }>{ bucket.key }</option>
					) ) }
				</select>
			</div>
		</div>
	);
}

export default Edit;
