import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';

type KeyboardAwareScrollContextValue = {
  scrollToInput: (inputContainerRef: RefObject<View | null>) => void;
};

const KeyboardAwareScrollContext =
  createContext<KeyboardAwareScrollContextValue | null>(null);

export function useKeyboardAwareScroll() {
  return useContext(KeyboardAwareScrollContext);
}

type KeyboardAwareScrollViewProps = PropsWithChildren<ScrollViewProps>;

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollToInput = useCallback((inputContainerRef: RefObject<View | null>) => {
    const delayMs = Platform.OS === 'android' ? 300 : 150;

    window.setTimeout(() => {
      const inputContainer = inputContainerRef.current;
      const content = contentRef.current;

      if (!inputContainer || !content) {
        return;
      }

      inputContainer.measureLayout(
        content,
        (_x, y) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 80),
            animated: true,
          });
        },
        () => {
          // No-op: measuring can fail briefly while the keyboard/layout is animating.
        }
      );
    }, delayMs);
  }, []);

  const contextValue = useMemo(
    () => ({
      scrollToInput,
    }),
    [scrollToInput]
  );

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        scrollIndicatorInsets={{
          bottom: keyboardHeight,
        }}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardHeight > 0 && {
            paddingBottom: keyboardHeight + 48,
          },
        ]}
        {...scrollViewProps}
      >
        <View
          ref={contentRef}
          collapsable={false}
          style={contentContainerStyle}
        >
          {children}
        </View>
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});