import {
    forwardRef,
    useImperativeHandle,
    useRef,
} from 'react';
import {
    StyleSheet,
    TextInput,
    View,
    type TextInputProps,
} from 'react-native';

import { UI_COLORS, UI_RADIUS } from '@/src/constants/ui';
import { useKeyboardAwareScroll } from './keyboard-aware-scroll-view';

export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  function AppTextInput(
    {
      style,
      onFocus,
      placeholderTextColor = UI_COLORS.inputPlaceholder,
      selectionColor = UI_COLORS.inputSelection,
      ...props
    },
    forwardedRef
  ) {
    const inputRef = useRef<TextInput>(null);
    const containerRef = useRef<View>(null);
    const keyboardAwareScroll = useKeyboardAwareScroll();

    useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);

    return (
      <View ref={containerRef} collapsable={false}>
        <TextInput
          ref={inputRef}
          placeholderTextColor={placeholderTextColor}
          selectionColor={selectionColor}
          onFocus={(event) => {
            keyboardAwareScroll?.scrollToInput(containerRef);
            onFocus?.(event);
          }}
          style={[styles.input, style]}
          {...props}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: UI_RADIUS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: UI_COLORS.inputBackground,
    color: UI_COLORS.inputText,
  },
});