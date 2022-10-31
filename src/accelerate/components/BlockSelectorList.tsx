import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { Button, Icon } from "@wordpress/components";
import { __ } from '@wordpress/i18n';
import { Post } from "../../util";
import Image from "./Image";
import classNames from 'classnames';

import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
	useSortable,
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragEventHandler } from 'react';

type ListProps = {
	blocks: Post[],
	selected: number[],
	onChange: Function,
}

export default function BlockSelectorList ( props: ListProps ) {
	const {
		blocks,
		onChange,
		selected,
	} = props;

	const sensors = useSensors(
		useSensor(PointerSensor),
	);

	function onDragEnd ( event: any ) {
		const { active, over } = event;

		// We have to only account for sorted items that are actually selected.
		const _oldIndex = selected.indexOf( active.id );
		const _newIndex = selected.indexOf( over.id );
		const sorted = arrayMove( selected, _oldIndex, _newIndex );
		onChange( sorted );
	}


	// Sort selected blocks according to selection.
	blocks.sort( ( a, b ) => selected.indexOf( a.id ) - selected.indexOf( b.id ) );
	// Sort other blocks AFTER selected one.
	blocks.sort( ( a, b ) => ( selected.includes( a.id ) ? 0 : 1 ) - ( selected.includes( b.id ) ? 0 : 1 ) );

	return (
		<div className="accelerate__block-list_wrapper">
			<DndContext
				sensors={ sensors }
				collisionDetection={ closestCenter }
				onDragEnd={ onDragEnd }
			>
			<SortableContext
				items={ blocks }
				strategy={ verticalListSortingStrategy }
			>
				<ul>
					{ blocks.map( ( block: Post, index: number ) => (
						<BlockSelectorListItem
							key={ block.id }
							block={ block }
							onAdd={ ( id: number ) => onChange( [ ...selected, id ] ) }
							onRemove={ ( id: number ) => onChange( selected.filter( child => child !== id ) ) }
							selected={ Array.from( selected ).includes( block.id ) }
						/>
					) ) }
				</ul>
			</SortableContext>
		</DndContext>
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

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable( {
		id: block.id,
		disabled: ! selected
	} );

	return (
		<div
			className={ classNames( 'accelerate__block-list_item', { 'accelerate__block-list_item--sortable': selected } ) }
			ref={ setNodeRef }
			style={ {
				transform: CSS.Transform.toString( transform ),
				transition,
			} }
			{ ...attributes }
			{ ...listeners }
		>
			{ selected && ( <Icon icon="move" /> ) || ( <Icon icon="" /> ) }
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
