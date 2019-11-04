clean:
	rm -rf bin node_modules

check:
	npm pack && tar -xvzf *.tgz && rm -rf package *.tgz


