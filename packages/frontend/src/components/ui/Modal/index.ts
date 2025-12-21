import { Modal as ModalRoot } from './Modal';
import { ModalHeader, ModalIcon, ModalTitle, ModalCloseButton } from './ModalHeader';
import { ModalContent } from './ModalContent';
import { ModalFooter } from './ModalFooter';
import { ConfirmModal } from './ConfirmModal';

// Compound Components パターンでエクスポート
export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Icon: ModalIcon,
  Title: ModalTitle,
  CloseButton: ModalCloseButton,
  Content: ModalContent,
  Footer: ModalFooter,
});

// 個別エクスポート（必要に応じて）
export { ModalRoot };
export { ModalHeader, ModalIcon, ModalTitle, ModalCloseButton };
export { ModalContent };
export { ModalFooter };
export { ConfirmModal };

// 型エクスポート
export type * from './types';
