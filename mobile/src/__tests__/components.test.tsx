import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { TourOverlay, endTour, startTour, useTour } from '../components/Tour';

const wrap = (el: ReactElement) => (
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>{el}</SafeAreaProvider>
);

describe('AuthButtons', () => {
  it('offers Google, email and skip, and no stand-in Apple button on iOS', async () => {
    const onIdentity = jest.fn();
    await render(wrap(<AuthButtons onIdentity={onIdentity} />));
    // On iOS only Apple's own button is used, once the system says it's available.
    expect(screen.queryByTestId('auth-apple')).toBeNull();
    expect(screen.getByTestId('auth-google')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('auth-skip'));
    expect(onIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'guest' }));
  });

  it('checks the email before continuing', async () => {
    const onIdentity = jest.fn();
    await render(wrap(<AuthButtons onIdentity={onIdentity} allowSkip={false} />));
    expect(screen.queryByTestId('auth-skip')).toBeNull();
    await fireEvent.press(screen.getByTestId('auth-email'));
    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'nope');
    await fireEvent.press(screen.getByTestId('auth-email-continue'));
    expect(onIdentity).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('auth-email-input'), 'Me@Example.com ');
    await fireEvent.press(screen.getByTestId('auth-email-continue'));
    expect(onIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'email', email: 'me@example.com' }));
  });
});

describe('Tour', () => {
  it('walks the steps with a counter and reports completion', async () => {
    const done = jest.fn();
    useTour.setState({ rects: { a: { x: 10, y: 10, w: 100, h: 40 }, b: { x: 10, y: 700, w: 100, h: 40 } } });
    await render(wrap(<TourOverlay />));
    await act(async () => {
      startTour(
        [
          { target: 'a', title: 'First', body: 'one', icon: 'wallet' },
          { target: 'b', title: 'Second', body: 'two', icon: 'packs' },
        ],
        done,
      );
    });
    expect(screen.getByTestId('tour-title').props.children).toBe('First');
    expect(screen.getByText('1 of 2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tour-next'));
    expect(screen.getByTestId('tour-title').props.children).toBe('Second');
    expect(screen.queryByTestId('tour-skip')).toBeNull();
    await fireEvent.press(screen.getByTestId('tour-next'));
    expect(done).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('tour')).toBeNull();
  });

  it('Skip ends the tour as not completed', async () => {
    const done = jest.fn();
    await render(wrap(<TourOverlay />));
    await act(async () => {
      startTour([{ target: 'missing', title: 'Only', body: 'x', icon: 'gift' }, { target: 'a', title: 'Two', body: 'y', icon: 'gift' }], done);
    });
    await fireEvent.press(screen.getByTestId('tour-skip'));
    expect(done).toHaveBeenCalledWith(false);
    act(() => endTour(false));
  });
});
