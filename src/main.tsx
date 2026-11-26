import { render } from 'preact';
import 'katex/dist/katex.min.css';
import './styles.css';
import { App } from './App';
import { initStore } from './store';

initStore().then(() => render(<App />, document.getElementById('app')!));
