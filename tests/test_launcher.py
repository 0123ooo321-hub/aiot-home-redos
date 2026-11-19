import importlib.util
from pathlib import Path
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
spec = importlib.util.spec_from_file_location('launcher', Path(__file__).resolve().parents[1] / 'launcher.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)
class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = launcher.LocalServer(('127.0.0.1', 0), launcher.Handler)
        cls.base = 'http://127.0.0.1:{}/'.format(cls.server.server_port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
    def test_ui_and_assets(self):
        for name in ['', 'model.js', 'app.js', 'style.css', 'icon.svg', 'college.jpg']:
            with urlopen(self.base + name) as response:
                self.assertEqual(response.status, 200)
                self.assertGreater(len(response.read()), 0)
                self.assertEqual(response.headers['X-Content-Type-Options'], 'nosniff')
    def test_private_files_not_served(self):
        for name in ['launcher.py', '../README.md', '%2e%2e/README.md', 'web/', 'unknown']:
            with self.assertRaises(HTTPError) as result:
                urlopen(self.base + name)
            self.assertEqual(result.exception.code, 404)
    def test_foreign_host_rejected(self):
        with self.assertRaises(HTTPError) as result:
            urlopen(Request(self.base, headers={'Host': 'example.com'}))
        self.assertEqual(result.exception.code, 403)
if __name__ == '__main__':
    unittest.main()
