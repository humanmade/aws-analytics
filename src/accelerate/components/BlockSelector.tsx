import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import BlockSelectorList from './BlockSelectorList';
import { Post } from '../../util';
import { useSelect } from '@wordpress/data';

type Props = {
	label: string,
	value: number[],
	onChange: ( blocks: number[] ) => void,
}

export default function BlockSelector( props: Props ) {
	const {
		value: blockIds,
		onChange,
	} = props;

	const [ search, setSearch ] = useState<string>( '' );

	const blocks = useSelect<Post[]>( select => {
		const args: {
			search?: string,
			include?: number[],
		} = {};

		if ( search.length > 0 ) {
			args.search = search;
		} else {
			args.include = blockIds;
		}

		return select( 'accelerate' ).getPosts( {
			type: 'wp_block,xb',
			...args,
		}, false );
	}, [ search ] );

	return (
		<>
			<TextControl
				type="search"
				label={ __( 'Search blocks', 'altis' ) }
				placeholder={ __( 'Search blocks', 'altis' ) }
				value={ search }
				hideLabelFromVision
				onChange={ setSearch }
			/>

			<BlockSelectorList
				blocks={ blocks }
				selected={ blockIds }
				onAdd={ ( id: number ) => onChange( [ ...blockIds, id ] ) }
				onRemove={ ( id: number ) => onChange( blockIds.filter( child => child !== id ) ) }
			/>
		</>
	);
}