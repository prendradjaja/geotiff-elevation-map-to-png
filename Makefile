dev:
	rm -f temp-output.png
	# node index.mjs example-lowres-input.tif temp-output.png
	node index.mjs example-input.tif temp-output.png
example:
	node index.mjs example-input.tif example-output.png
clean:
	rm temp-output.png
