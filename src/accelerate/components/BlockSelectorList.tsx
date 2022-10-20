import { Button } from "@wordpress/components";
import { __ } from '@wordpress/i18n';
import { Post } from "../../util";
import Image from "./Image";

type ListProps = {
	blocks: Post[],
	selected: number[],
	onAdd: Function,
	onRemove: Function,
}

export default function BlockSelectorList ( props: ListProps ) {
	const {
		blocks,
		onAdd,
		onRemove,
		selected,
	} = props;

	return (
		<div className="accelerate__block-list_wrapper">
			{ blocks.map( block => (
				<BlockSelectorListItem
					block={ block }
					onAdd={ onAdd }
					onRemove={ onRemove }
					selected={ Array.from( selected ).includes( block.id ) }
				/> )
			) }
		</div>
	)
}

type BlockItemProps = {
	block: Post,
	selected: boolean,
	onAdd: Function,
	onRemove: Function,
}

function BlockSelectorListItem ( props: BlockItemProps ) {
	const {
		block,
		selected,
		onAdd,
		onRemove
	} = props;

	return (
		<div className="accelerate__block-list_item">
			<div className="accelerate__block-list_item--thumb">
				{ block.thumbnail && (
					<Image
						src={ block.thumbnail }
						alt={ block.title }
						width={ 105 }
						height={ 47 }
					/>
				) }
			</div>
			<div className="accelerate__block-list_item--details">
				<div className="accelerate__block-list_item--title" title={ block.title }>
					{ block.title }
				</div>
			</div>
			<div className="accelerate__block-list_item--actions">
				{ selected
					? (
						<Button isSecondary isSmall className="accelerate__block-list_item--remove" onClick={ () => onRemove( block.id ) }>
							{ __( 'Remove', 'altis' ) }
						</Button>
					) : (
						<Button isSecondary isSmall className="accelerate__block-list_item--add" onClick={ () => onAdd( block.id ) }>
							{ __( 'Add', 'altis' ) }
						</Button>
					)
				}
			</div>
		</div>
	);
}