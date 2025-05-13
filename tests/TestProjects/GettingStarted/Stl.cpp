#include <vector>

#ifdef __ICC430__
// MSP430 has some weird concept of how the stl:s work...
vector<float> LargeVector(25, 42.0);
#else
std::vector<float> LargeVector(25, 42.0);
#endif
