/*
 * TouchDesigner GLSL Pixel Shader: drawPoints
 * 
 * Reads input array of point coordinates and draws them to specified radius 
 * 'pointSize', point coordinates are in the space x=[0,resX], y=[0,resY]
 */

/*
 * Max static storage allocated for input array of point pairs
 * 
 * Note from Documentation: If you are using Uniform Arrays, you can use the
 * built-in variable int(var('SYS_GFX_GLSL_MAX_UNIFORMS')) to get an idea of how
 * many values you can pass to the shader.
 */
#define MAX_LINES 128

/* INPUTS from TouchDesigner: */
uniform int numLinesIn; /* Count of points */
uniform vec2 points[MAX_LINES]; /* All points */

uniform float pointSize;
uniform float aliasWeight; /* Weight of neighbouring pixel smoothing [0-1] */

/* OUTPUTS to TouchDesigner: */
out vec4 fragColor; /* Pixel output (r, g, b, a) */

/* Function Prototypes: */
vec4 getPixel(vec2 uv);
float drawPoint(vec2 P, vec2 A, float radius);

void main()
{
	/* Compute in coordinates defined by output aspect */
	vec2 uv = vUV.st * uTDOutputInfo.res.zw;
	vec4 colorOut;

	if (aliasWeight > 0)
	{
		colorOut = vec4(0.0);
        for (int i = -1; i <= 1; i++) 
		{
			for (int j = -1; j <= 1; j++)
			{
				if (i != 0 && j != 0) {
					vec2 uvA = uv + (vec2(i, j)/2.0);
					colorOut += getPixel(uvA);
				}
			}
			colorOut += getPixel(uv) * 9 * (1 - aliasWeight);
			colorOut /= 9;
        }
		colorOut += getPixel(uv);
	}
	else
	{
		colorOut = getPixel(uv);
	}

	fragColor = TDOutputSwizzle(colorOut);
}

/**
 * getPixel
 *
 * Abstraction of pixel calculation in order to support per-pixel anti-aliasing.
 * Iterates line segments to draw them in their respectively prescribed styles.
 */
vec4 getPixel(vec2 uv)
{
	vec4 drawColor = vec4(0, 0, 0, 1);
	vec4 outColor  = vec4(0);
	
	/* Max out at smaller of: (max allocated count, requested count) */
	int numLines = (numLinesIn < MAX_LINES) ? numLinesIn : MAX_LINES;

	/* Iterate all line segments */
	for (int i = 0; i < numLines; i++)
	{
		vec2 A = points[i].xy;
		float intensity = drawPoint(uv, A, pointSize);
		outColor = mix(outColor, drawColor, intensity);
	}

	return outColor;
}

float drawPoint(vec2 P, vec2 A, float radius)
{
	float distance = length(A - P) - radius;
	return smoothstep(0.1, 0, distance);
}
