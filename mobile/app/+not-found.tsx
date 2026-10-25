import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Empty } from '../src/components/ui';
import { colors } from '../src/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }} testID="screen-not-found">
      <Empty icon="compass" title="Nothing here" body="That page isn't part of the app." action={<Button label="Go to Packs" onPress={() => router.replace('/')} />} />
    </View>
  );
}
